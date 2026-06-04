'use strict';

const express = require('express');
const path = require('path');
const auth = require('./auth');
const db = require('./db');
const { buildScopeSnapshot, getApprovedReportsForScope, loadReportingConfig } = require('./reporting/report-config');
const { generateEmbedConfig, getEmbedCredentialState } = require('./reporting/embed-token');

const app = express();
app.use(express.json({ limit: '64kb' }));

const APP_ROLE = process.env.APP_ROLE || 'director';
const APP_NAME = process.env.APP_NAME || 'director-portal';
const ALLOWED = ['director'];

db.init().then(ok => { if (ok) console.log(`[${APP_ROLE}] db ready`); }).catch(() => {});

auth.mountAuth(app, { allowedRoles: ALLOWED });

function sendNoAccess(req, res) {
  if (req.user) {
    const scope = buildScopeSnapshot(req.user);
    db.logDirectorPortalAccessAudit({
      directorSubjectId: req.user.email,
      actorRole: req.user.role,
      scopeSnapshot: scope,
      outcome: 'blocked_scope'
    }).catch(() => {});
  }
  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    return res.status(200).sendFile(path.join(__dirname, 'public', 'no-access.html'));
  }
  return res.status(403).json({ error: 'director_scope_required', message: 'This portal is reserved for directors with an approved school or region scope.' });
}

function hasDirectorScope(user) {
  const scope = buildScopeSnapshot(user);
  return scope.granted;
}

app.get('/api/health', (_req, res) => {
  const reporting = loadReportingConfig();
  const embed = getEmbedCredentialState();
  res.json({
    status: 'ok',
    role: APP_ROLE,
    reporting: {
      loaded: reporting.loaded,
      path: reporting.path,
      defaultAggregationLevel: reporting.defaultAggregationLevel,
      reportCount: reporting.reports.length,
      fabric: reporting.fabric,
      embed: {
        configured: embed.configured,
        missing: embed.missing
      },
      error: reporting.error
    },
    db: { enabled: db.enabled, host: process.env.PG_HOST || null, database: process.env.PG_DATABASE || null }
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/') || req.path === '/api/health' || req.path === '/login.html' || req.path === '/no-access.html' || req.path === '/favicon.ico' || req.path === '/logo.svg') {
    return next();
  }
  if (!req.user) {
    if (req.accepts('html') && !req.path.startsWith('/api/')) return res.redirect('/login.html');
    return res.status(401).json({ error: 'authentication required' });
  }
  if (!hasDirectorScope(req.user)) {
    return sendNoAccess(req, res);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
  }
}));

app.get('/api/auth/me', (req, res) => {
  res.json({ user: auth.publicProfile(req.user), allowedRoles: ALLOWED, directorAuthorization: buildScopeSnapshot(req.user) });
});

app.get('/api/reporting/metadata', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  const reporting = loadReportingConfig();
  const scopeSnapshot = buildScopeSnapshot(req.user);
  if (!scopeSnapshot.granted) {
    db.logDirectorPortalAccessAudit({
      directorSubjectId: req.user.email,
      actorRole: req.user.role,
      scopeSnapshot,
      outcome: 'blocked_scope'
    }).catch(() => {});
    return res.status(403).json({ error: 'director_scope_required', scope: scopeSnapshot, reporting: { loaded: reporting.loaded, error: reporting.error } });
  }
  const reports = getApprovedReportsForScope(reporting, scopeSnapshot);
  db.logDirectorPortalAccessAudit({
    directorSubjectId: req.user.email,
    actorRole: req.user.role,
    scopeSnapshot,
    outcome: reports.length ? 'opened' : 'fail_closed'
  }).catch(() => {});
  if (!reporting.loaded || reporting.error) {
    db.recordAuditEvent({
      eventType: 'reporting_config_state',
      actorId: req.user.email,
      actorRole: req.user.role,
      targetType: 'reporting_config',
      targetId: 'director-portal',
      scope: scopeSnapshot,
      outcome: reporting.error || 'missing'
    }).catch(() => {});
  }
  res.json({
    status: reports.length ? 'ready' : 'fail-closed',
    scope: scopeSnapshot,
    reporting: {
      loaded: reporting.loaded,
      path: reporting.path,
      defaultAggregationLevel: reporting.defaultAggregationLevel,
      reportCount: reporting.reports.length,
      fabric: reporting.fabric,
      error: reporting.error
    },
    reports
  });
});

app.get('/api/reporting/health', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (!hasDirectorScope(req.user)) return sendNoAccess(req, res);
  const reporting = loadReportingConfig();
  const scope = buildScopeSnapshot(req.user);
  const embed = getEmbedCredentialState();
  const storage = await db.getHierarchyStorageStats().catch(() => null);
  res.json({
    status: reporting.loaded ? 'ok' : 'fail-closed',
    scope,
    reporting: {
      loaded: reporting.loaded,
      defaultAggregationLevel: reporting.defaultAggregationLevel,
      reportCount: reporting.reports.length,
      fabric: reporting.fabric,
      error: reporting.error
    },
    embed: {
      configured: embed.configured,
      missing: embed.missing
    },
    storage
  });
});

app.get('/api/reporting/embed/:reportId', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (!hasDirectorScope(req.user)) return sendNoAccess(req, res);
  const reporting = loadReportingConfig();
  const scopeSnapshot = buildScopeSnapshot(req.user);
  const allowedReports = getApprovedReportsForScope(reporting, scopeSnapshot);
  const reportId = String(req.params.reportId || '').trim();
  const report = allowedReports.find(item => item.reportId === reportId);
  if (!report) {
    await db.logDirectorReportUsageAudit({
      directorSubjectId: req.user.email,
      actorRole: req.user.role,
      reportId,
      scopeSnapshot,
      outcome: 'blocked_scope'
    }).catch(() => {});
    return res.status(404).json({ error: 'report_not_available_for_scope' });
  }
  try {
    const embed = await generateEmbedConfig(report);
    await db.logDirectorReportUsageAudit({
      directorSubjectId: req.user.email,
      actorRole: req.user.role,
      reportId,
      scopeSnapshot,
      outcome: 'embed_token_issued'
    }).catch(() => {});
    return res.json({ ok: true, report, embed });
  } catch (error) {
    await db.recordAuditEvent({
      eventType: 'director_embed_config',
      actorId: req.user.email,
      actorRole: req.user.role,
      targetType: 'report',
      targetId: reportId,
      scope: scopeSnapshot,
      outcome: error.code || 'embed_failed'
    }).catch(() => {});
    return res.status(503).json({
      error: 'embed_configuration_unavailable',
      detail: String(error && error.message || error),
      code: error && error.code ? error.code : 'embed_failed'
    });
  }
});

app.get('/api/data/hierarchy', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (!hasDirectorScope(req.user)) return sendNoAccess(req, res);
  const asOfRaw = String(req.query?.asOf || '').trim();
  const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
  if (Number.isNaN(asOf.getTime())) return res.status(400).json({ error: 'invalid_asOf' });
  const hierarchy = await db.getHierarchySummary({ asOf });
  const scope = buildScopeSnapshot(req.user);
  res.json({ enabled: true, asOf: asOf.toISOString(), scope, hierarchy });
});

app.get('/api/data/hierarchy/storage', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (!hasDirectorScope(req.user)) return sendNoAccess(req, res);
  const stats = await db.getHierarchyStorageStats();
  const scope = buildScopeSnapshot(req.user);
  res.json({ enabled: true, scope, stats });
});

app.post('/api/reporting/session', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (!hasDirectorScope(req.user)) return sendNoAccess(req, res);
  const reporting = loadReportingConfig();
  const scopeSnapshot = buildScopeSnapshot(req.user);
  const reportId = String(req.body?.reportId || '').trim() || null;
  const report = (reporting.reports || []).find(item => item.reportId === reportId) || null;
  const outcome = report && report.approved ? 'opened' : 'blocked';
  await db.recordDirectorPortalSession({
    directorSubjectId: req.user.email,
    role: req.user.role,
    scopeSnapshot,
    reportId: report ? report.reportId : reportId,
    outcome
  }).catch(() => {});
  await db.recordAuditEvent({
    eventType: 'director-portal-session',
    actorId: req.user.email,
    actorRole: req.user.role,
    targetType: 'report',
    targetId: report ? report.reportId : reportId || 'portal',
    scope: scopeSnapshot,
    outcome
  }).catch(() => {});
  await db.logDirectorReportUsageAudit({
    directorSubjectId: req.user.email,
    actorRole: req.user.role,
    reportId: report ? report.reportId : reportId,
    scopeSnapshot,
    outcome
  }).catch(() => {});
  res.json({ ok: true, outcome, report: report || null, scope: scopeSnapshot });
});

app.listen(process.env.PORT || 3000, () => console.log(`[${APP_NAME}] listening`));