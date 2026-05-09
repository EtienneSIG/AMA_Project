// LearnEU admin console — operations dashboard for the 3 user-facing apps.
// - Reuses shared auth lib (cookie-session, bcryptjs, role-gated to 'admin' only).
// - Calls Azure Resource Manager via the system-assigned MI (DefaultAzureCredential).
//   Requires Website Contributor role on the 3 sibling sites (granted in Bicep).
'use strict';

const express = require('express');
const path = require('path');
const auth = require('./auth');
const { DefaultAzureCredential } = require('@azure/identity');

const app = express();
app.use(express.json({ limit: '64kb' }));

const APP_ROLE = 'admin';
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

auth.mountAuth(app, { allowedRoles: ALLOWED });

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    role: APP_ROLE,
    subscriptionConfigured: Boolean(SUB),
    resourceGroup: RG,
    managedSites: MANAGED_SITES,
    region: process.env.REGION_NAME || 'westeurope'
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

// --- Logs panel: ARM deployments per managed site ---
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

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[admin] listening on :${port} (managed=${MANAGED_SITES.join(',')})`));
