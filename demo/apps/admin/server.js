// LearnEU admin console — operations dashboard for the 3 user-facing apps.
// - Reuses shared auth lib (cookie-session, bcryptjs, role-gated to 'admin' only).
// - Calls Azure Resource Manager via the system-assigned MI (DefaultAzureCredential).
//   Requires Website Contributor role on the 3 sibling sites (granted in Bicep).
'use strict';

const express = require('express');
const path = require('path');
const auth = require('./auth');
const db = require('./db');
const cs = require('./contentSafety');
const { DefaultAzureCredential } = require('@azure/identity');

const app = express();
app.use(express.json({ limit: '64kb' }));

const APP_ROLE = 'admin';
const APP_NAME = 'admin';
const ALLOWED = ['admin'];
const SUB = process.env.AZURE_SUBSCRIPTION_ID || '';
const RG  = process.env.AZURE_RESOURCE_GROUP  || '';
const ENV_NAME = process.env.ENV_NAME || 'learneu-demo';
// Sites this admin app manages (admin itself excluded — never restart yourself).
const MANAGED_SITES = [
  `app-learner-web-${ENV_NAME}`,
  `app-parent-portal-${ENV_NAME}`,
  `app-teacher-console-${ENV_NAME}`
];

// Fire-and-forget DB schema init.
db.init().then(ok => { if (ok) console.log('[admin] db ready'); }).catch(() => {});

auth.mountAuth(app, { allowedRoles: ALLOWED });

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    role: APP_ROLE,
    subscriptionConfigured: Boolean(SUB),
    resourceGroup: RG,
    managedSites: MANAGED_SITES,
    region: process.env.REGION_NAME || 'westeurope',
    db: { enabled: db.enabled, host: process.env.PG_HOST || null, database: process.env.PG_DATABASE || null },
    contentSafety: { enabled: cs.enabled, threshold: cs.threshold, endpoint: cs.endpoint || null }
  });
});

app.use(auth.gateMiddleware(ALLOWED));
app.use(express.static(path.join(__dirname, 'public')));

// --- ARM helper ---
let _credential = null;
function credential() {
  if (!_credential) _credential = new DefaultAzureCredential();
  return _credential;
}
async function arm(method, urlPath, body) {
  if (!SUB || !RG) throw new Error('AZURE_SUBSCRIPTION_ID / AZURE_RESOURCE_GROUP not set');
  const tok = await credential().getToken('https://management.azure.com/.default');
  const url = `https://management.azure.com${urlPath}`;
  const r = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${tok.token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const ct = r.headers.get('content-type') || '';
  const text = await r.text();
  const data = ct.includes('application/json') && text ? JSON.parse(text) : text;
  if (!r.ok) {
    const err = new Error(`ARM ${method} ${urlPath} -> ${r.status}`);
    err.status = r.status; err.body = data;
    throw err;
  }
  return data;
}

// --- Admin endpoints (admin role enforced by gateMiddleware) ---

// List managed sites with state + hostname + last-deployed timestamp.
app.get('/api/admin/sites', async (_req, res) => {
  try {
    const out = [];
    for (const name of MANAGED_SITES) {
      try {
        const site = await arm('GET', `/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${name}?api-version=2023-12-01`);
        out.push({
          name,
          state: site.properties?.state,
          hostname: site.properties?.defaultHostName,
          lastModifiedTimeUtc: site.properties?.lastModifiedTimeUtc,
          enabledHostNames: site.properties?.enabledHostNames || [],
          location: site.location
        });
      } catch (e) {
        out.push({ name, error: e.body?.error?.message || e.message, status: e.status });
      }
    }
    res.json({ sites: out });
  } catch (e) {
    res.status(500).json({ error: 'arm failure', detail: String(e.message || e) });
  }
});

// Live health probe of each sibling app (calls their public /api/health).
app.get('/api/admin/health', async (_req, res) => {
  const results = await Promise.all(MANAGED_SITES.map(async name => {
    const url = `https://${name}.azurewebsites.net/api/health`;
    const t0 = Date.now();
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const ms = Date.now() - t0;
      const j = await r.json().catch(() => null);
      return { name, status: r.status, ms, payload: j };
    } catch (e) {
      return { name, error: String(e.message || e), ms: Date.now() - t0 };
    }
  }));
  res.json({ checks: results });
});

// Restart a managed site.
app.post('/api/admin/restart/:name', async (req, res) => {
  const name = req.params.name;
  if (!MANAGED_SITES.includes(name)) return res.status(400).json({ error: 'site not managed by this admin app', name });
  try {
    await arm('POST', `/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${name}/restart?api-version=2023-12-01&softRestart=false&synchronous=false`);
    res.json({ ok: true, name, action: 'restart-requested', at: new Date().toISOString() });
  } catch (e) {
    res.status(e.status || 500).json({ error: 'restart failed', detail: e.body?.error?.message || e.message });
  }
});

// Audit-style summary: who-am-I + managed list.
app.get('/api/admin/whoami', (req, res) => {
  res.json({
    user: req.user && { email: req.user.email, role: req.user.role, firstName: req.user.firstName },
    subscription: SUB,
    resourceGroup: RG,
    managedSites: MANAGED_SITES
  });
});

// --- Users panel: canonical seed users from local auth lib ---
app.get('/api/admin/users', (_req, res) => {
  if (typeof auth.getStats !== 'function') return res.json({ users: [], note: 'auth.getStats not available' });
  const local = auth.getStats();
  res.json({
    source: 'admin-local-auth',
    note: 'Seed user catalog (in-memory, identical across all 4 apps). Sheet counts here are admin-only and always 0.',
    users: local.users
  });
});

// --- Items panel: aggregate per-site sheet counts via /api/health ---
app.get('/api/admin/items', async (_req, res) => {
  const sites = await Promise.all(MANAGED_SITES.map(async name => {
    try {
      const r = await fetch(`https://${name}.azurewebsites.net/api/health`, { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      return {
        name,
        role: j.role,
        sheetCount: j.stats?.sheetCount ?? 0,
        users: j.stats?.users || [],
        userCount: j.stats?.total ?? 0
      };
    } catch (e) {
      return { name, error: String(e.message || e) };
    }
  }));
  const totalSheets = sites.reduce((acc, s) => acc + (s.sheetCount || 0), 0);
  res.json({ sites, totalSheets });
});

app.get('/api/admin/deployments/:name', async (req, res) => {
  const name = req.params.name;
  if (!MANAGED_SITES.includes(name)) return res.status(400).json({ error: 'site not managed' });
  try {
    const data = await arm('GET', `/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${name}/deployments?api-version=2023-12-01`);
    const items = (data.value || []).slice(0, 8).map(d => ({
      id: d.id,
      status: d.properties?.status,
      statusText: d.properties?.status_text,
      author: d.properties?.author,
      message: d.properties?.message,
      startTime: d.properties?.start_time,
      endTime: d.properties?.end_time,
      active: d.properties?.active
    }));
    res.json({ name, count: items.length, deployments: items });
  } catch (e) {
    res.status(e.status || 500).json({ error: 'deployments fetch failed', detail: e.body?.error?.message || e.message });
  }
});

// --- DB-backed audit panels (Postgres) ---

// Recent connection events (login / logout / failed) across all apps.
app.get('/api/admin/logs/connections', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const r = await db._query(
    `SELECT id, email, role, app, event, ip, user_agent, detail, created_at
     FROM connection_logs ORDER BY created_at DESC LIMIT $1`, [limit]
  );
  res.json({ enabled: true, count: r ? r.rows.length : 0, rows: r ? r.rows : [] });
});

// Recent /api/chat round-trips across all apps.
app.get('/api/admin/logs/asks', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const r = await db._query(
    `SELECT id, email, role, app, LEFT(prompt, 200) AS prompt_preview, model,
            prompt_tokens, completion_tokens, total_tokens, latency_ms, status,
            CASE WHEN error IS NULL THEN NULL ELSE LEFT(error, 200) END AS error,
            created_at
     FROM ask_history ORDER BY created_at DESC LIMIT $1`, [limit]
  );
  res.json({ enabled: true, count: r ? r.rows.length : 0, rows: r ? r.rows : [] });
});

// Aggregate sheet counts from Postgres.
app.get('/api/admin/logs/sheets', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const r = await db._query(
    `SELECT app, role, COUNT(*)::INT AS sheet_count, MAX(created_at) AS last_created
     FROM sheets GROUP BY app, role ORDER BY app, role`, []
  );
  res.json({ enabled: true, rows: r ? r.rows : [] });
});

// --- Reference data panels -------------------------------------------------
app.get('/api/admin/data/curricula', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listCurricula();
  res.json({ enabled: true, count: rows ? rows.length : 0, rows: rows || [] });
});
app.get('/api/admin/data/glossary', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listGlossary();
  res.json({ enabled: true, count: rows ? rows.length : 0, rows: rows || [] });
});
app.get('/api/admin/data/learners', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.summariseLearners();
  const totalR = await db._query(`SELECT COUNT(*)::INT AS n FROM learners`);
  res.json({ enabled: true, totalLearners: totalR && totalR.rows[0] ? totalR.rows[0].n : 0, rows: rows || [] });
});

// --- Content Safety panel --------------------------------------------------
let csOverride = null; // in-memory override for the demo; resets on restart.
app.get('/api/admin/cs/status', (_req, res) => {
  res.json({
    configured: cs.enabled,
    threshold: cs.threshold,
    endpoint: cs.endpoint || null,
    runtimeEnabled: csOverride === null ? cs.enabled : csOverride
  });
});
app.post('/api/admin/cs/toggle', (req, res) => {
  const enabled = Boolean(req.body && req.body.enabled);
  csOverride = enabled;
  // Tell every downstream app via env? No — demo: set process flag, propagate via /chat path is server-side per app.
  // For real propagation we'd hit ARM appsettings; here we expose the override in the admin UI only.
  res.json({ runtimeEnabled: csOverride, note: 'Override is local to the admin process. To enforce across apps, restart with CONTENT_SAFETY_ENABLED app setting changed.' });
});
app.post('/api/admin/cs/test', async (req, res) => {
  const text = String(req.body && req.body.text || '');
  if (!text) return res.status(400).json({ error: 'text required' });
  const r = await cs.analyze(text);
  res.json(r);
});
app.get('/api/admin/cs/recent', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const r = await db._query(
    `SELECT id, ask_id, email, app, direction, blocked, hate, self_harm, sexual, violence, created_at
     FROM content_safety_results ORDER BY created_at DESC LIMIT $1`, [limit]
  );
  res.json({ enabled: true, rows: r ? r.rows : [] });
});

// --- ONNX adaptive model panel ---------------------------------------------
const fs = require('fs');
app.get('/api/admin/onnx/status', (_req, res) => {
  // The model file is bundled inside learner-web; expose its presence via the sibling /models/learner.onnx URL.
  res.json({
    expectedUrl: `https://app-learner-web-${ENV_NAME}.azurewebsites.net/models/learner.onnx`,
    note: 'ONNX runs client-side in the learner-web app via onnxruntime-web. The model is shipped with the static assets.'
  });
});
app.get('/api/admin/onnx/attempts', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const r = await db._query(
    `SELECT id, email, pseudonym, item_id, difficulty, predicted, correct, latency_ms, created_at
     FROM item_attempts ORDER BY created_at DESC LIMIT $1`, [limit]
  );
  res.json({ enabled: true, rows: r ? r.rows : [] });
});
app.get('/api/admin/onnx/stats', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.attemptStats();
  res.json({ enabled: true, rows: rows || [] });
});

// --- Quality telemetry (Feature 3) ----------------------------------------
app.get('/api/admin/quality/kpis', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, kpis: null });
  const kpis = await db.getQualityKpis();
  res.json({ enabled: true, kpis });
});
app.get('/api/admin/quality/feedback', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.getQualityFeedback({ limit: req.query.limit });
  res.json({ enabled: true, rows: rows || [] });
});

// --- Fairness dashboard (Feature 010 — EU AI Act Annex IV / RAI release gate) ---
// Aggregate: acceptance_rate, cs_violation_rate, override_rate per cohort
// n < 10 suppression (FR-005 / FR-008 — never expose individual data).
app.get('/api/admin/fairness', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const windowDays = Math.min(Math.max(parseInt(req.query.window, 10) || 30, 1), 365);
  const r = await db._query(`
    SELECT
      COALESCE(l.market,            'Unknown') AS country,
      COALESCE(l.gender,            'Unknown') AS gender,
      COALESCE(l.sen::text,         'false')   AS sen_status,
      count(a.id)::int                         AS n,
      CASE WHEN count(a.id) >= 10 THEN
        round(100.0 * sum(CASE WHEN a.status = 200 THEN 1 ELSE 0 END)
              / NULLIF(count(a.id), 0), 1)
      END AS acceptance_rate,
      CASE WHEN count(a.id) >= 10 THEN
        round(100.0 * count(c.id) FILTER (WHERE c.blocked)
              / NULLIF(count(c.id), 0), 1)
      END AS cs_violation_rate,
      CASE WHEN count(a.id) >= 10 THEN
        round(100.0 * count(DISTINCT ov.id)
              / NULLIF(count(a.id), 0), 1)
      END AS override_rate
    FROM learners l
    LEFT JOIN ask_history a
           ON a.email = l.email
          AND a.created_at >= now() - ($1 * INTERVAL '1 day')
    LEFT JOIN content_safety_results c ON c.ask_id = a.id
    LEFT JOIN teacher_overrides ov
           ON ov.learner_email = l.email
          AND ov.created_at   >= now() - ($1 * INTERVAL '1 day')
    GROUP BY l.market, l.gender, l.sen
    ORDER BY country, gender, sen_status
  `, [windowDays]);
  const rows = r ? r.rows : [];
  // Compute per-metric disparity (max − min over cohorts with n≥10).
  const metrics = ['acceptance_rate', 'cs_violation_rate', 'override_rate'];
  const disparity = {};
  for (const m of metrics) {
    const vals = rows.map(r2 => r2[m]).filter(v => v !== null && v !== undefined);
    if (vals.length >= 2) {
      const diff = Math.max(...vals) - Math.min(...vals);
      disparity[m] = { value: Math.round(diff * 10) / 10, flag: diff > 5 };
    } else {
      disparity[m] = { value: null, flag: false };
    }
  }
  res.json({ enabled: true, window: windowDays, rows, disparity });
});

// CSV export for Annex IV technical file.
app.get('/api/admin/fairness/csv', async (req, res) => {
  if (!db.enabled) return res.status(503).send('DB not configured');
  const windowDays = Math.min(Math.max(parseInt(req.query.window, 10) || 30, 1), 365);
  const r = await db._query(`
    SELECT
      COALESCE(l.market,    'Unknown') AS country,
      COALESCE(l.gender,    'Unknown') AS gender,
      COALESCE(l.sen::text, 'false')   AS sen_status,
      count(a.id)::int                 AS n,
      CASE WHEN count(a.id) >= 10 THEN round(100.0 * sum(CASE WHEN a.status=200 THEN 1 ELSE 0 END)/NULLIF(count(a.id),0),1) END AS acceptance_rate,
      CASE WHEN count(a.id) >= 10 THEN round(100.0 * count(c.id) FILTER (WHERE c.blocked)/NULLIF(count(c.id),0),1) END AS cs_violation_rate,
      CASE WHEN count(a.id) >= 10 THEN round(100.0 * count(DISTINCT ov.id)/NULLIF(count(a.id),0),1) END AS override_rate
    FROM learners l
    LEFT JOIN ask_history a ON a.email=l.email AND a.created_at>=now()-($1*INTERVAL '1 day')
    LEFT JOIN content_safety_results c ON c.ask_id=a.id
    LEFT JOIN teacher_overrides ov ON ov.learner_email=l.email AND ov.created_at>=now()-($1*INTERVAL '1 day')
    GROUP BY l.market, l.gender, l.sen
    ORDER BY country, gender, sen_status
  `, [windowDays]);
  const rows = r ? r.rows : [];
  const ts = new Date().toISOString();
  const winStart = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  const winEnd   = new Date().toISOString().slice(0, 10);
  const header = 'country,language,sen_status,gender,n,acceptance_rate,cs_violation_rate,override_rate,window_start,window_end,exported_at';
  const csvRows = rows.map(row =>
    [row.country, row.country, row.sen_status, row.gender,
     row.n, row.acceptance_rate ?? '', row.cs_violation_rate ?? '', row.override_rate ?? '',
     winStart, winEnd, ts
    ].join(',')
  );
  const fname = `fairness-${ts.slice(0,16).replace(/[-:T]/g,'')}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  res.send([header, ...csvRows].join('\n'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[admin] listening on :${port} (managed=${MANAGED_SITES.join(',')})`));
