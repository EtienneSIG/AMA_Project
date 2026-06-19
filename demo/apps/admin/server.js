// LearnEU admin console — operations dashboard for the 3 user-facing apps.
// - Reuses shared auth lib (cookie-session, bcryptjs, role-gated to 'admin' only).
// - Calls Azure Resource Manager via the system-assigned MI (DefaultAzureCredential).
//   Requires Website Contributor role on the 3 sibling sites (granted in Bicep).
'use strict';

const express = require('express');
const path = require('path');
const crypto = require('crypto');
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
const FABRIC_RG = String(process.env.FABRIC_RESOURCE_GROUP || RG || '').trim();
const ENV_NAME = process.env.ENV_NAME || 'learneu-demo';
const PG_SERVER = process.env.PG_SERVER_NAME || (process.env.PG_HOST || '').split('.')[0] || `pg-${ENV_NAME}`;
const PG_API_VERSION = process.env.PG_ARM_API_VERSION || '2024-08-01';
const FABRIC_CAPACITY = String(process.env.FABRIC_CAPACITY_NAME || '').trim();
const FABRIC_API_VERSION = process.env.FABRIC_ARM_API_VERSION || '2023-11-01';
// Sites this admin app manages (admin itself excluded — never restart yourself).
const MANAGED_SITES = [
  `app-learner-web-${ENV_NAME}`,
  `app-parent-portal-${ENV_NAME}`,
  `app-teacher-console-${ENV_NAME}`
];
let cachedFabricCapacityName = FABRIC_CAPACITY || null;

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

function pgResourcePath() {
  return `/subscriptions/${SUB}/resourceGroups/${RG}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${encodeURIComponent(PG_SERVER)}`;
}

function fabricResourcePath(capacityName) {
  return `/subscriptions/${SUB}/resourceGroups/${FABRIC_RG}/providers/Microsoft.Fabric/capacities/${encodeURIComponent(capacityName)}`;
}

function requestCorrelationId(req) {
  const fromHeader = String(req.headers['x-correlation-id'] || '').trim();
  if (fromHeader) return fromHeader.slice(0, 128);
  return crypto.randomUUID();
}

async function readPostgresState() {
  const data = await arm('GET', `${pgResourcePath()}?api-version=${PG_API_VERSION}`);
  return {
    serverName: PG_SERVER,
    state: data.properties?.state || 'Unknown',
    location: data.location || null
  };
}

async function resolveFabricCapacityName() {
  if (cachedFabricCapacityName) return cachedFabricCapacityName;
  const list = await arm('GET', `/subscriptions/${SUB}/resourceGroups/${FABRIC_RG}/providers/Microsoft.Fabric/capacities?api-version=${FABRIC_API_VERSION}`);
  const capacities = Array.isArray(list?.value) ? list.value : [];
  if (!capacities.length) {
    const error = new Error('No Microsoft.Fabric/capacities resource found in this resource group.');
    error.code = 'fabric_capacity_not_found';
    throw error;
  }
  if (capacities.length > 1) {
    const names = capacities.map(c => c?.name).filter(Boolean);
    const error = new Error(`Multiple Fabric capacities found (${names.join(', ')}). Set FABRIC_CAPACITY_NAME on the admin app.`);
    error.code = 'fabric_capacity_ambiguous';
    throw error;
  }
  cachedFabricCapacityName = capacities[0]?.name || null;
  return cachedFabricCapacityName;
}

async function readFabricState() {
  const capacityName = await resolveFabricCapacityName();
  const data = await arm('GET', `${fabricResourcePath(capacityName)}?api-version=${FABRIC_API_VERSION}`);
  const state = data.properties?.state || data.properties?.provisioningState || 'Unknown';
  return {
    capacityName,
    state,
    provisioningState: data.properties?.provisioningState || null,
    location: data.location || null,
    sku: data.sku?.name || null
  };
}

async function auditPgEvent(req, eventType, outcome, correlationId, detail) {
  if (!db.enabled || typeof db.logOperationalEvent !== 'function') return;
  await db.logOperationalEvent({
    app: APP_NAME,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    eventType,
    outcome,
    correlationId,
    detail
  });
}

async function auditFabricEvent(req, eventType, outcome, correlationId, detail) {
  if (!db.enabled || typeof db.logOperationalEvent !== 'function') return;
  await db.logOperationalEvent({
    app: APP_NAME,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    eventType,
    outcome,
    correlationId,
    detail
  });
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

app.get('/api/admin/postgres/status', async (req, res) => {
  const correlationId = requestCorrelationId(req);
  try {
    const pg = await readPostgresState();
    await auditPgEvent(req, 'postgres_status_check', 'ok', correlationId, `state=${pg.state}`);
    res.json({
      ok: true,
      correlationId,
      checkedAt: new Date().toISOString(),
      serverName: pg.serverName,
      state: pg.state,
      location: pg.location
    });
  } catch (e) {
    const detail = e.body?.error?.message || e.message;
    await auditPgEvent(req, 'postgres_status_check', 'error', correlationId, detail);
    res.status(e.status || 500).json({
      ok: false,
      correlationId,
      checkedAt: new Date().toISOString(),
      serverName: PG_SERVER,
      error: 'postgres status check failed',
      detail
    });
  }
});

app.post('/api/admin/postgres/wakeup', async (req, res) => {
  const correlationId = requestCorrelationId(req);
  try {
    const pg = await readPostgresState();
    const current = String(pg.state || '').toLowerCase();
    if (current === 'ready' || current === 'starting') {
      const outcome = current === 'ready' ? 'already-running' : 'in-progress';
      await auditPgEvent(req, 'postgres_wakeup', outcome, correlationId, `state=${pg.state}`);
      return res.json({
        ok: true,
        correlationId,
        action: 'wakeup-skipped',
        outcome,
        state: pg.state,
        message: current === 'ready'
          ? 'PostgreSQL is already running.'
          : 'PostgreSQL start is already in progress.'
      });
    }

    await arm('POST', `${pgResourcePath()}/start?api-version=${PG_API_VERSION}`);
    await auditPgEvent(req, 'postgres_wakeup', 'accepted', correlationId, `previousState=${pg.state}`);
    return res.json({
      ok: true,
      correlationId,
      action: 'wakeup-requested',
      outcome: 'accepted',
      previousState: pg.state,
      message: 'Start request sent. PostgreSQL may take 3-6 minutes to become Ready.'
    });
  } catch (e) {
    const detail = e.body?.error?.message || e.message;
    await auditPgEvent(req, 'postgres_wakeup', 'error', correlationId, detail);
    return res.status(e.status || 500).json({
      ok: false,
      correlationId,
      action: 'wakeup-failed',
      outcome: 'failed',
      error: 'postgres wakeup failed',
      detail
    });
  }
});

app.get('/api/admin/fabric/status', async (req, res) => {
  const correlationId = requestCorrelationId(req);
  try {
    const fabric = await readFabricState();
    await auditFabricEvent(req, 'fabric_status_check', 'ok', correlationId, `state=${fabric.state}`);
    res.json({
      ok: true,
      correlationId,
      checkedAt: new Date().toISOString(),
      capacityName: fabric.capacityName,
      state: fabric.state,
      provisioningState: fabric.provisioningState,
      location: fabric.location,
      sku: fabric.sku
    });
  } catch (e) {
    const detail = e.body?.error?.message || e.message;
    await auditFabricEvent(req, 'fabric_status_check', 'error', correlationId, detail);
    res.status(e.status || 500).json({
      ok: false,
      correlationId,
      checkedAt: new Date().toISOString(),
      capacityName: cachedFabricCapacityName,
      error: 'fabric status check failed',
      detail
    });
  }
});

app.post('/api/admin/fabric/wakeup', async (req, res) => {
  const correlationId = requestCorrelationId(req);
  try {
    const fabric = await readFabricState();
    const current = String(fabric.state || '').toLowerCase();
    if (current === 'active') {
      await auditFabricEvent(req, 'fabric_wakeup', 'already-running', correlationId, `state=${fabric.state}`);
      return res.json({
        ok: true,
        correlationId,
        action: 'wakeup-skipped',
        outcome: 'already-running',
        state: fabric.state,
        message: 'Fabric capacity is already active.'
      });
    }
    if (current === 'resuming' || current === 'provisioning' || current === 'preparing' || current === 'updating' || current === 'scaling') {
      await auditFabricEvent(req, 'fabric_wakeup', 'in-progress', correlationId, `state=${fabric.state}`);
      return res.json({
        ok: true,
        correlationId,
        action: 'wakeup-skipped',
        outcome: 'in-progress',
        state: fabric.state,
        message: 'Fabric capacity resume is already in progress.'
      });
    }

    await arm('POST', `${fabricResourcePath(fabric.capacityName)}/resume?api-version=${FABRIC_API_VERSION}`);
    await auditFabricEvent(req, 'fabric_wakeup', 'accepted', correlationId, `previousState=${fabric.state}`);
    return res.json({
      ok: true,
      correlationId,
      action: 'wakeup-requested',
      outcome: 'accepted',
      previousState: fabric.state,
      message: 'Resume request sent. Fabric capacity may take a short time to become Active.'
    });
  } catch (e) {
    const detail = e.body?.error?.message || e.message;
    await auditFabricEvent(req, 'fabric_wakeup', 'error', correlationId, detail);
    return res.status(e.status || 500).json({
      ok: false,
      correlationId,
      action: 'wakeup-failed',
      outcome: 'failed',
      error: 'fabric wakeup failed',
      detail
    });
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

app.get('/api/admin/gamification/kpis', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, kpis: null });
  const r = await db._query(
    `SELECT
       (SELECT COUNT(*)::int FROM learner_activity WHERE day = CURRENT_DATE AND email LIKE 'student%@learneu.demo') AS attempts_today,
       (SELECT COUNT(*)::int FROM learner_daily_chests WHERE day = CURRENT_DATE) AS chest_claims_today,
       (SELECT COUNT(*)::int FROM learner_badges WHERE earned_at > now() - INTERVAL '24 hours') AS badges_24h,
       (SELECT COUNT(*)::int FROM learner_motivation_messages WHERE status = 'active' AND created_at > now() - INTERVAL '24 hours') AS motivation_posts_24h,
       (SELECT COUNT(*)::int FROM learner_gamification_overrides WHERE created_at > now() - INTERVAL '24 hours') AS moderation_actions_24h,
       (SELECT COUNT(*)::int FROM item_attempts ia
         WHERE ia.email LIKE 'student%@learneu.demo'
           AND ia.correct = true
           AND ia.created_at > now() - INTERVAL '24 hours') AS correct_attempts_24h`,
    []
  );
  res.json({ enabled: true, kpis: r && r.rows[0] ? r.rows[0] : null });
});

// ===================== Feature 009 — Interoperability admin console =====================
// Connector configuration, health, SCORM onboarding, SIS sync, SSO onboarding,
// calendar sync, and GDPR export orchestration. All flows enforce EU-only endpoints,
// Key Vault secret references (no plaintext), and immutable external API audit logging.
const euEndpoint = require('./integrations/eu-endpoint');
const secretProvider = require('./security/secret-provider');
const scormAdapter = require('./integrations/scorm-adapter');
const ssoFederation = require('./integrations/sso-federation');
const calendarAdapter = require('./integrations/calendar-adapter');
const sisAdapter = require('./integrations/sis-adapter');
const gdprExport = require('./integrations/gdpr-export');
const { payloadHash, summarise } = require('./integrations/audit-redaction');

const cidGen = () => (typeof db.newCorrelationId === 'function' ? db.newCorrelationId() : 'cid-' + crypto.randomBytes(6).toString('hex'));

// --- Connector configuration CRUD ---
app.get('/api/admin/integrations', async (_req, res) => {
  try {
    const rows = await db.listIntegrationConfigs();
    // Never return secrets — only the reference and whether it validates.
    res.json({ connectors: (rows || []).map(r => ({
      id: r.id, connectorType: r.connector_type, name: r.name, endpoint: r.endpoint,
      region: r.region, secretRef: r.secret_ref ? '«reference set»' : null,
      enabled: r.enabled, status: r.status
    })) });
  } catch (e) { res.status(500).json({ error: 'integrations_list_failed' }); }
});

app.post('/api/admin/integrations', async (req, res) => {
  const { connectorType, name, endpoint, secretRef, claimMap, enabled } = req.body || {};
  if (!connectorType || !name) return res.status(400).json({ error: 'connectorType and name required' });
  // EU residency: reject non-EU endpoints (fail closed).
  if (endpoint) { const eu = euEndpoint.isEuEndpoint(endpoint); if (!eu.ok) return res.status(422).json({ error: 'non_eu_endpoint', detail: eu.reason }); }
  // Secrets must be Key Vault references, never plaintext.
  try { secretProvider.assertReferenceOnly(secretRef, 'secretRef'); }
  catch (e) { return res.status(422).json({ error: 'plaintext_secret_rejected', detail: e.message }); }
  try {
    const row = await db.upsertIntegrationConfig({ connectorType, name, endpoint, region: 'westeurope', secretRef, claimMap, enabled: Boolean(enabled), createdBy: req.user && req.user.email });
    res.json({ ok: true, id: row && row.id, status: row && row.status });
  } catch (e) { res.status(500).json({ error: 'integration_save_failed' }); }
});

// --- Connector health probe ---
app.get('/api/admin/integrations/health', async (_req, res) => {
  try {
    const rows = await db.listIntegrationConfigs();
    const out = [];
    for (const r of (rows || [])) {
      const euOk = r.endpoint ? euEndpoint.isEuEndpoint(r.endpoint).ok : true;
      const secretOk = r.secret_ref ? secretProvider.isSecretReference(r.secret_ref) : true;
      const status = (euOk && secretOk && r.enabled) ? 'healthy' : (r.enabled ? 'degraded' : 'disabled');
      if (r.id) await db.setIntegrationStatus({ id: r.id, status }).catch(() => {});
      out.push({ connectorType: r.connector_type, name: r.name, status, euResident: euOk, secretReferenceValid: secretOk });
    }
    res.json({ probes: out });
  } catch (e) { res.status(500).json({ error: 'integrations_health_failed' }); }
});

// --- SCORM onboarding ---
app.post('/api/admin/scorm/packages', async (req, res) => {
  const cid = cidGen();
  try {
    const parsed = scormAdapter.parseManifest(req.body && req.body.manifest);
    if (!parsed.ok) {
      await db.logExternalApiAudit({ correlationId: cid, connectorType: 'scorm', eventType: 'scorm_parse_failed', outcome: 'failure', statusCode: 422, redactedSummary: parsed.reason, actor: req.user && req.user.email }).catch(() => {});
      return res.status(422).json({ error: 'manifest_unparseable', detail: parsed.reason });
    }
    const pkg = await db.upsertScormPackage({ packageId: parsed.packageId, title: parsed.title, scormVersion: parsed.scormVersion, launchHref: parsed.launchHref, manifest: parsed.manifest, status: 'parsed', uploadedBy: req.user && req.user.email });
    await db.logExternalApiAudit({ correlationId: cid, connectorType: 'scorm', eventType: 'scorm_package_uploaded', outcome: 'success', statusCode: 201, payloadHash: payloadHash(parsed.packageId), redactedSummary: `uploaded ${parsed.title}`, actor: req.user && req.user.email }).catch(() => {});
    res.json({ ok: true, packageId: pkg && pkg.package_id, title: parsed.title, scormVersion: parsed.scormVersion });
  } catch (e) { res.status(500).json({ error: 'scorm_onboard_failed' }); }
});
app.get('/api/admin/scorm/packages', async (_req, res) => {
  try { const pkgs = await db.listScormPackages(); res.json({ packages: (pkgs || []).map(p => ({ packageId: p.package_id, title: p.title, scormVersion: p.scorm_version, status: p.status })) }); }
  catch (e) { res.status(500).json({ error: 'scorm_list_failed' }); }
});

// --- SIS roster sync ---
app.post('/api/admin/sis/sync', async (req, res) => {
  const cid = cidGen();
  const jobId = 'sis-' + crypto.randomBytes(6).toString('hex');
  const mode = (req.body && req.body.mode) === 'full' ? 'full' : 'delta';
  const roster = (req.body && Array.isArray(req.body.roster)) ? req.body.roster : [];
  try {
    await db.createSisSyncJob({ jobId, mode });
    await db.logExternalApiAudit({ correlationId: cid, connectorType: 'sis', eventType: 'sis_sync_started', outcome: 'success', statusCode: 202, redactedSummary: `mode=${mode} rows=${roster.length}`, actor: req.user && req.user.email }).catch(() => {});
    const plan = sisAdapter.planSync(roster, {});
    const checksum = sisAdapter.rosterChecksum(roster);
    for (const c of plan.conflicts) {
      await db.createSisConflict({ jobId, learnerRef: c.learnerRef, conflictType: c.conflictType, details: c.details }).catch(() => {});
    }
    await db.finishSisSyncJob({ jobId, status: 'completed', learnersSeen: roster.length, upserts: plan.upserts.length, conflicts: plan.conflicts.length, checksum });
    await db.logExternalApiAudit({ correlationId: cid, connectorType: 'sis', eventType: 'sis_sync_completed', outcome: 'success', statusCode: 200, payloadHash: payloadHash(checksum), redactedSummary: `upserts=${plan.upserts.length} conflicts=${plan.conflicts.length}`, actor: req.user && req.user.email }).catch(() => {});
    if (plan.conflicts.length) await db.logExternalApiAudit({ correlationId: cid, connectorType: 'sis', eventType: 'sis_conflict_opened', outcome: 'review', statusCode: 409, redactedSummary: `${plan.conflicts.length} conflicts queued`, actor: 'system' }).catch(() => {});
    res.json({ ok: true, jobId, upserts: plan.upserts.length, conflicts: plan.conflicts.length, checksum });
  } catch (e) { res.status(500).json({ error: 'sis_sync_failed' }); }
});
app.get('/api/admin/sis/sync/:jobId', async (req, res) => {
  try { const job = await db.getSisSyncJob({ jobId: req.params.jobId }); if (!job) return res.status(404).json({ error: 'job_not_found' }); res.json({ job }); }
  catch (e) { res.status(500).json({ error: 'sis_status_failed' }); }
});
app.get('/api/admin/sis/conflicts', async (req, res) => {
  try { const rows = await db.listSisConflicts({ status: req.query.status }); res.json({ conflicts: rows }); }
  catch (e) { res.status(500).json({ error: 'sis_conflicts_failed' }); }
});
app.post('/api/admin/sis/conflicts/:id/resolve', async (req, res) => {
  try {
    const row = await db.resolveSisConflict({ id: req.params.id, resolution: req.body && req.body.resolution, resolvedBy: req.user && req.user.email });
    if (!row) return res.status(404).json({ error: 'conflict_not_found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'sis_resolve_failed' }); }
});

// --- SSO federation onboarding ---
app.post('/api/admin/sso/connectors', async (req, res) => {
  const cid = cidGen();
  const { provider, issuer, jwksUri, claimMap, secretRef } = req.body || {};
  const v = ssoFederation.validateMetadata({ issuer, jwksUri, claimMap });
  if (!v.ok) return res.status(422).json({ error: 'invalid_idp_metadata', detail: v.reason });
  try { secretProvider.assertReferenceOnly(secretRef, 'secretRef'); }
  catch (e) { return res.status(422).json({ error: 'plaintext_secret_rejected', detail: e.message }); }
  try {
    await db.upsertIntegrationConfig({ connectorType: 'sso', name: provider || issuer, endpoint: issuer, region: 'westeurope', secretRef, claimMap, enabled: true, createdBy: req.user && req.user.email });
    await db.logExternalApiAudit({ correlationId: cid, connectorType: 'sso', eventType: 'sso_link_created', outcome: 'success', statusCode: 201, redactedSummary: `provider=${provider || issuer}`, actor: req.user && req.user.email }).catch(() => {});
    res.json({ ok: true, provider: provider || issuer });
  } catch (e) { res.status(500).json({ error: 'sso_onboard_failed' }); }
});
app.get('/api/admin/sso/links', async (_req, res) => {
  try { const rows = await db.listSsoLinks(); res.json({ links: rows.map(r => ({ id: r.id, provider: r.provider, learnerEmail: r.learner_email, status: r.status })) }); }
  catch (e) { res.status(500).json({ error: 'sso_links_failed' }); }
});

// --- Calendar sync ---
app.post('/api/admin/calendar/sync', async (req, res) => {
  const cid = cidGen();
  const events = (req.body && Array.isArray(req.body.events)) ? req.body.events : [];
  try {
    const checksum = payloadHash(events.map(e => `${e.date}|${e.kind || 'closure'}`).sort().join('\n'));
    let ingested = 0;
    for (const e of events) {
      if (!e.date) continue;
      await db.upsertCalendarEvent({ provider: e.provider || 'school', eventDate: e.date, kind: e.kind || 'closure', label: e.label, sourceChecksum: checksum }).catch(() => {});
      ingested++;
    }
    await db.logExternalApiAudit({ correlationId: cid, connectorType: 'calendar', eventType: 'calendar_sync_ingested', outcome: 'success', statusCode: 200, payloadHash: payloadHash(checksum), redactedSummary: `ingested=${ingested}`, actor: req.user && req.user.email }).catch(() => {});
    res.json({ ok: true, ingested, checksum });
  } catch (e) { res.status(500).json({ error: 'calendar_sync_failed' }); }
});

// --- GDPR Art. 15 data export ---
app.post('/api/admin/exports', async (req, res) => {
  const cid = cidGen();
  const subjectEmail = (req.body && req.body.subjectEmail || '').toLowerCase();
  if (!subjectEmail) return res.status(400).json({ error: 'subjectEmail required' });
  const requestId = 'exp-' + crypto.randomBytes(8).toString('hex');
  try {
    await db.createExportRequest({ requestId, subjectEmail, requestedBy: req.user && req.user.email, slaDueAt: gdprExport.slaDueAt() });
    await db.logExternalApiAudit({ correlationId: cid, connectorType: 'gdpr', eventType: 'gdpr_export_requested', outcome: 'success', statusCode: 202, redactedSummary: `subject=${payloadHash(subjectEmail).slice(0, 12)}`, actor: req.user && req.user.email }).catch(() => {});
    // Collect + package (synchronous for the demo; large exports would defer via fallback).
    const sections = await gdprExport.collectSubjectData(db, subjectEmail);
    const manifest = gdprExport.buildManifest(subjectEmail, sections);
    const totalRecords = Object.values(manifest.recordCounts).reduce((a, b) => a + b, 0);
    const link = gdprExport.secureLink(requestId);
    manifest.encryption = gdprExport.encryptionEnvelope();
    const status = totalRecords > 5000 ? 'queued_large' : 'ready';
    await db.updateExportRequest({ requestId, status, packageRef: 'demo://export/' + requestId, manifest, linkExpiresAt: link.expiresAt });
    await db.logExternalApiAudit({ correlationId: cid, connectorType: 'gdpr', eventType: 'gdpr_export_packaged', outcome: 'success', statusCode: 200, redactedSummary: summarise({ files: manifest.files.length, records: totalRecords, status }), actor: 'system' }).catch(() => {});
    res.json({ ok: true, requestId, status, manifest: { files: manifest.files, recordCounts: manifest.recordCounts, format: manifest.format }, link });
  } catch (e) { res.status(500).json({ error: 'export_failed' }); }
});
app.get('/api/admin/exports', async (_req, res) => {
  try { const rows = await db.listExportRequests({ limit: 100 }); res.json({ exports: rows.map(r => ({ requestId: r.request_id, subject: payloadHash(r.subject_email).slice(0, 12), status: r.status, slaDueAt: r.sla_due_at, linkExpiresAt: r.link_expires_at })) }); }
  catch (e) { res.status(500).json({ error: 'exports_list_failed' }); }
});
app.get('/api/admin/exports/:requestId', async (req, res) => {
  try {
    const r = await db.getExportRequest({ requestId: req.params.requestId });
    if (!r) return res.status(404).json({ error: 'export_not_found' });
    const expired = r.link_expires_at && new Date(r.link_expires_at) < new Date();
    if (expired) await db.logExternalApiAudit({ connectorType: 'gdpr', eventType: 'gdpr_export_expired', outcome: 'expired', statusCode: 410, redactedSummary: req.params.requestId, actor: 'system' }).catch(() => {});
    res.json({ requestId: r.request_id, status: expired ? 'expired' : r.status, manifest: r.manifest, slaDueAt: r.sla_due_at, linkExpiresAt: r.link_expires_at, linkExpired: Boolean(expired) });
  } catch (e) { res.status(500).json({ error: 'export_status_failed' }); }
});

// --- External API audit trail (read-only, immutable) ---
app.get('/api/admin/integrations/audit', async (req, res) => {
  try { const rows = await db.listExternalApiAudit({ connectorType: req.query.connectorType, limit: 200 }); res.json({ events: rows }); }
  catch (e) { res.status(500).json({ error: 'audit_read_failed' }); }
});

// ===================== Feature 010 — CMS Versioning & Approval governance =====================
// Governed content lifecycle: authoring, approvals (mandatory pedagogy/compliance/
// localization gates, Art. 14), immutable snapshots, fail-closed publish/rollback
// (Art. 15), localization branching, metadata discovery, deprecation/archive, and
// the Art. 12 immutable audit trail. Admins act as any governance reviewer in the demo.
const { makeCmsService } = require('./services/cms');
const cms = makeCmsService(db);

function cmsActor(req) { return (req.user && req.user.email) || 'admin'; }
// In the demo an authenticated admin holds all governance capabilities.
function cmsCaps(req) { return require('./auth/roles').capabilitiesFor(req.user || { role: 'admin' }); }
function cmsGuard(req, res) {
  if (!cms.enabled) { res.status(503).json({ error: 'cms_unavailable', detail: 'Database is required for content governance.' }); return false; }
  return true;
}

// --- Content items & versions ---
app.post('/api/admin/cms/items', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const { title, contentType, defaultLocale } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title_required' });
    const item = await cms.createContent({ title, contentType, defaultLocale, actor: cmsActor(req) });
    res.json({ ok: true, item });
  } catch (e) { res.status(e.code === 'UNSUPPORTED_LOCALE' ? 400 : 500).json({ error: e.code || 'item_create_failed', detail: e.detail }); }
});
app.get('/api/admin/cms/items', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try { res.json({ items: await db.listContentItems({ lifecycleStatus: req.query.status, limit: 200 }) }); }
  catch (e) { res.status(500).json({ error: 'items_list_failed' }); }
});
app.get('/api/admin/cms/items/:itemId/versions', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try { res.json({ versions: await db.listContentVersions({ contentItemId: req.params.itemId }) }); }
  catch (e) { res.status(500).json({ error: 'versions_list_failed' }); }
});
app.post('/api/admin/cms/items/:itemId/versions', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const { semanticVersion, locale, branchType, payload, changeSummary, previousVersionId, isMaterialChange } = req.body || {};
    if (!semanticVersion || !locale) return res.status(400).json({ error: 'semantic_version_and_locale_required' });
    const version = await cms.createDraft({ contentItemId: req.params.itemId, semanticVersion, locale, branchType, payload, changeSummary, previousVersionId, isMaterialChange, actor: cmsActor(req) });
    res.json({ ok: true, version });
  } catch (e) { res.status(['INVALID_SEMANTIC_VERSION', 'UNSUPPORTED_LOCALE'].includes(e.code) ? 400 : 500).json({ error: e.code || 'version_create_failed', detail: e.detail }); }
});

// --- Metadata tagging (publish-time completeness gate) ---
app.post('/api/admin/cms/versions/:versionId/metadata', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const m = req.body || {};
    const tag = await cms.tagMetadata({ contentVersionId: req.params.versionId, meta: {
      curriculumStandard: m.curriculumStandard, subject: m.subject, gradeLevel: m.gradeLevel,
      difficulty: m.difficulty, learningObjective: m.learningObjective, prerequisiteVersionIds: m.prerequisiteVersionIds,
    }, actor: cmsActor(req) });
    res.json({ ok: true, tag });
  } catch (e) { res.status(500).json({ error: 'metadata_failed' }); }
});
app.get('/api/admin/cms/search', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try { res.json({ results: await db.searchContentMetadata({ subject: req.query.subject, gradeLevel: req.query.gradeLevel, curriculumStandard: req.query.curriculumStandard, limit: 100 }) }); }
  catch (e) { res.status(500).json({ error: 'search_failed' }); }
});

// --- Approval workflow ---
app.post('/api/admin/cms/versions/:versionId/submit', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const r = await cms.submitForReview({ contentVersionId: req.params.versionId, actor: cmsActor(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(500).json({ error: 'submit_failed' }); }
});
app.get('/api/admin/cms/approvals/pending', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try { res.json({ pending: await db.listPendingApprovals({ role: req.query.role }) }); }
  catch (e) { res.status(500).json({ error: 'pending_failed' }); }
});
app.post('/api/admin/cms/workflows/:workflowId/decisions', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const { decision, comment } = req.body || {};
    if (!['approved', 'changes_requested', 'rejected'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' });
    const r = await cms.recordDecision({ workflowInstanceId: req.params.workflowId, decision, comment, actor: cmsActor(req), actorCapabilities: cmsCaps(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(500).json({ error: 'decision_failed' }); }
});

// --- Publish / rollback (fail-closed) ---
app.post('/api/admin/cms/versions/:versionId/publish', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const r = await cms.publish({ contentVersionId: req.params.versionId, actor: cmsActor(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(500).json({ error: 'publish_failed' }); }
});
app.post('/api/admin/cms/items/:itemId/rollback', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const { targetVersionId, rationale } = req.body || {};
    const r = await cms.rollback({ contentItemId: req.params.itemId, targetVersionId, rationale, actor: cmsActor(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(500).json({ error: 'rollback_failed' }); }
});

// --- Localization branching ---
app.post('/api/admin/cms/items/:itemId/localization-branches', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const { locale, sourceVersionId, payload, semanticVersion } = req.body || {};
    const r = await cms.createLocalizationBranch({ contentItemId: req.params.itemId, locale, sourceVersionId, payload, semanticVersion, actor: cmsActor(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(e.code === 'UNSUPPORTED_LOCALE' ? 400 : 500).json({ error: e.code || 'branch_failed', detail: e.detail }); }
});
app.get('/api/admin/cms/items/:itemId/localization-branches', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try { res.json({ branches: await db.listLocalizationBranches({ contentItemId: req.params.itemId }) }); }
  catch (e) { res.status(500).json({ error: 'branches_failed' }); }
});
app.post('/api/admin/cms/localization-branches/:branchId/merge-choice', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const r = await cms.recordMergeChoice({ branchId: req.params.branchId, choice: (req.body || {}).choice, actor: cmsActor(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(500).json({ error: 'merge_choice_failed' }); }
});

// --- Deprecation lifecycle ---
app.post('/api/admin/cms/items/:itemId/deprecate', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const { eolDate, replacementContentItemId, rationale } = req.body || {};
    const r = await cms.deprecate({ contentItemId: req.params.itemId, eolDate, replacementContentItemId, rationale, actor: cmsActor(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(500).json({ error: 'deprecate_failed' }); }
});
app.post('/api/admin/cms/items/:itemId/archive', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try {
    const r = await cms.archive({ contentItemId: req.params.itemId, rationale: (req.body || {}).rationale, actor: cmsActor(req) });
    res.status(r.ok ? 200 : 409).json(r);
  } catch (e) { res.status(500).json({ error: 'archive_failed' }); }
});

// --- Lineage + audit transparency (Art. 12/13) ---
app.get('/api/admin/cms/versions/:versionId/lineage', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try { res.json(await cms.lineage({ versionId: req.params.versionId })); }
  catch (e) { res.status(500).json({ error: 'lineage_failed' }); }
});
app.get('/api/admin/cms/audit', async (req, res) => {
  if (!cmsGuard(req, res)) return;
  try { res.json({ events: await db.listContentAudit({ contentItemId: req.query.itemId, limit: 200 }) }); }
  catch (e) { res.status(500).json({ error: 'cms_audit_failed' }); }
});

// Feature 011 — Multi-school hierarchy governance routes (scope RBAC, district
// approvals, hierarchical reporting, benchmarking, audit). Guarded require.
try {
  require('./server-hierarchy')(app, { db, APP_ROLE: 'admin' });
} catch (e) {
  console.warn('[hierarchy] routes not mounted:', e && e.message);
}

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[admin] listening on :${port} (managed=${MANAGED_SITES.join(',')})`));
