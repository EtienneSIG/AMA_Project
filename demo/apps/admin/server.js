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

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[admin] listening on :${port} (managed=${MANAGED_SITES.join(',')})`));
