'use strict';

// Rayfin Fabric App backend (demo runtime). On Fabric this is the data-app backend;
// locally it serves the governed report API + the static frontend. Suppression/scope
// run in ./rayfin/data; the portal-signed ScopeContext is verified fail-closed here.

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const model = require('./rayfin/data/model');

const app = express();
app.use(express.json({ limit: '32kb' }));

const PORT = process.env.PORT || 8080;
const REGION = process.env.RAYFIN_REGION || 'northeurope';
const EU_REGIONS = new Set(['northeurope', 'westeurope', 'francecentral', 'germanywestcentral', 'swedencentral']);
const SECRET = process.env.SCOPE_CONTEXT_SECRET || 'demo-shared-secret';

function euResident() { return EU_REGIONS.has(REGION); }

// Verify the portal-signed ScopeContext (HMAC over the scope payload). Fail-closed.
function verifyScope(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (sig !== expected) return null;
  try {
    const scope = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (scope.expiresAt && Date.parse(scope.expiresAt) < Date.now()) return null;
    return scope;
  } catch { return null; }
}

const accessLog = [];
function audit(ev) { accessLog.push({ ...ev, at: new Date().toISOString() }); }

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'director-fabric-app', region: REGION, euResident: euResident(), capacity: process.env.RAYFIN_CAPACITY || null });
});

app.get('/api/metadata', (req, res) => {
  if (!euResident()) return res.status(503).json({ state: 'fabric_unavailable', residency: { region: REGION, euResident: false } });
  res.json({
    backend: 'fabric-app',
    reports: [
      { id: 'class-evolution', title: 'Class outcome evolution', kind: 'trend' },
      { id: 'establishment-vs-national', title: 'Establishment vs national', kind: 'benchmark' }
    ],
    periods: model.APPROVED_PERIODS,
    residency: { region: REGION, euResident: true }
  });
});

app.get('/api/report/:id', (req, res) => {
  if (!euResident()) return res.status(503).json({ state: 'fabric_unavailable' });
  const scope = verifyScope(req.header('x-scope-context') || req.query.scope);
  if (!scope) { audit({ report: req.params.id, state: 'scope_denied', source: 'fabric-app' }); return res.status(403).json({ state: 'scope_denied' }); }
  const out = model.runReport({ reportId: req.params.id, scope, period: req.query.period, metric: req.query.metric, limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0 });
  audit({ report: req.params.id, state: out.state, subject: scope.directorSubjectId, source: 'fabric-app', correlationId: req.header('x-correlation-id') || null });
  res.json({ ...out, backend: 'fabric-app' });
});

app.get('/api/audit', (_req, res) => res.json({ events: accessLog.slice(-100) }));
app.use(express.static(path.join(__dirname, 'src')));

if (require.main === module) app.listen(PORT, () => console.log(`director-fabric-app on :${PORT} (${REGION})`));
module.exports = app;
