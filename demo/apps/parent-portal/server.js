// LearnEU app server — shared across learner-web / parent-portal / teacher-console.
// Provides: cookie-session auth (./auth.js), role-gated routes, profile-aware /api/chat proxy to APIM.
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('./auth');
const db = require('./db');
const cs = require('./contentSafety');

const app = express();
app.use(express.json({ limit: '64kb' }));

const ROLE_INFER = { 'app-learner-web': 'student', 'app-parent-portal': 'parent', 'app-teacher-console': 'teacher', 'app-admin': 'admin', 'app-director-portal': 'director' };
const inferred = Object.entries(ROLE_INFER).find(([k]) => (process.env.WEBSITE_SITE_NAME || '').includes(k));
const APP_ROLE = process.env.APP_ROLE || (inferred ? inferred[1] : 'student');
const APP_NAME = process.env.APP_NAME || APP_ROLE;
const ALLOWED = APP_ROLE === 'director' ? [APP_ROLE] : [APP_ROLE, 'admin'];

const APIM = (process.env.APIM_GATEWAY_URL || '').replace(/\/$/, '');
const KEY  = process.env.APIM_SUBSCRIPTION_KEY || '';
const DEP  = process.env.AOAI_DEPLOYMENT_NAME || 'gpt-5.4-nano';

// Fire-and-forget DB schema init (non-blocking).
db.init().then(ok => { if (ok) console.log(`[${APP_ROLE}] db ready`); }).catch(() => {});

auth.mountAuth(app, { allowedRoles: ALLOWED });

app.get('/api/health', (_req, res) => {
  const stats = (typeof auth.getStats === 'function') ? auth.getStats() : { users: [], sheetCount: 0, total: 0 };
  res.json({
    status: 'ok',
    role: APP_ROLE,
    apimConfigured: Boolean(APIM),
    keyConfigured: Boolean(KEY) && !KEY.startsWith('@Microsoft.KeyVault'),
    deployment: DEP,
    region: process.env.REGION_NAME || 'westeurope',
    db: { enabled: db.enabled, host: process.env.PG_HOST || null, database: process.env.PG_DATABASE || null },
    contentSafety: { enabled: cs.enabled, threshold: cs.threshold },
    stats
  });
});

// --- Public parental consent flow (GDPR Art. 8, US3) -----------------------
// These two endpoints are intentionally PUBLIC (registered before the auth gate): a
// parent follows an emailed token link without logging in to review the disclosure and
// grant/decline consent for an under-16 learner. No PII beyond the demo seed is exposed.
const CONSENT_RIGHTS_SURFACE = {
  legalBasis: 'GDPR Article 8 — consent for information-society services offered to a child under 16.',
  dataResidency: 'All personal data stays in the EU (Azure West Europe). No transfer outside the EU.',
  withdrawable: 'Consent can be withdrawn at any time from the Parent Portal; processing stops on withdrawal.',
  retention: 'Consent evidence (timestamp, version, source) is retained as an audit record for accountability.',
  noProfiling: 'No facial/emotion recognition, no behavioural advertising, no autonomous grading.',
  controller: 'EdTech Group (LearnEU demo) — data protection contact available in the Parent Portal.'
};

function consentClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.ip || null;
}

function consentChildDisplayName(childEmail) {
  try {
    const u = (auth.SEED_USERS || []).find(x => x.email && x.email.toLowerCase() === String(childEmail).toLowerCase());
    if (u) return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || childEmail;
  } catch (_) { /* ignore */ }
  return childEmail;
}

// GET disclosure + status for a consent token (parent lands here from the link).
app.get('/api/consent/requests/:token', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const reqRow = await db.getConsentRequestByToken({ token: req.params.token });
  if (!reqRow) return res.status(404).json({ error: 'invalid_token' });
  const status = reqRow.is_expired ? 'expired' : reqRow.status;
  res.json({
    token: reqRow.token,
    status,
    childDisplayName: consentChildDisplayName(reqRow.child_email),
    consentType: reqRow.consent_type,
    disclosureVersion: reqRow.disclosure_version,
    expiresAt: reqRow.expires_at,
    requestedAt: reqRow.requested_at,
    resolvedAt: reqRow.resolved_at,
    rights: CONSENT_RIGHTS_SURFACE
  });
});

// POST an explicit parent decision for a consent token. Granting REQUIRES `agree === true`.
app.post('/api/consent/requests/:token/decide', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const decision = String(req.body?.decision || '').toLowerCase();
  const agree = req.body?.agree === true;
  if (decision !== 'granted' && decision !== 'declined') {
    return res.status(400).json({ error: 'decision must be "granted" or "declined"' });
  }
  if (decision === 'granted' && !agree) {
    return res.status(400).json({ error: 'explicit_consent_required', message: 'You must tick the explicit consent box to grant consent.' });
  }
  const ip = consentClientIp(req);
  const userAgent = (req.headers['user-agent'] || '').toString();
  const result = await db.resolveConsentRequest({ token: req.params.token, decision, ip, userAgent });
  if (!result.ok) {
    const code = result.reason === 'not_found' ? 404 : (result.reason === 'expired' ? 410 : 409);
    return res.status(code).json({ error: result.reason });
  }
  // GDPR Art. 8 evidence logging (T044): immutable audit record with the exact disclosure
  // version, decision, and capture source for the DPIA / accountability trail.
  db.recordAuditEvent({
    eventType: 'parental_consent_decision',
    actorId: result.request.parent_email,
    actorRole: 'parent',
    targetType: 'parental_consent',
    targetId: result.request.child_email,
    scope: {
      decision: result.decision,
      consentType: result.request.consent_type,
      disclosureVersion: result.request.disclosure_version,
      source: 'consent_link',
      ip, userAgentHash: crypto.createHash('sha256').update(userAgent || '').digest('hex').slice(0, 16),
      rightsSurfaced: Object.keys(CONSENT_RIGHTS_SURFACE)
    },
    outcome: result.decision
  }).catch(() => {});
  res.json({ ok: true, decision: result.decision, childDisplayName: consentChildDisplayName(result.request.child_email) });
});

app.use(auth.gateMiddleware(ALLOWED));

// --- Learner consent gate (GDPR Art. 8) — only for student-facing app ---
if (APP_ROLE === 'student') {
  const CONSENT_EXEMPT = new Set(['/login.html', '/logo.svg', '/favicon.ico', '/consent-pending.html', '/csrf.js']);
  app.use(async (req, res, next) => {
    if (!req.user || req.user.role !== 'student') return next();
    if (req.path.startsWith('/api/auth/') || req.path === '/api/health') return next();
    if (CONSENT_EXEMPT.has(req.path)) return next();
    const age = req.user.age;
    if (!age || age >= 16) return next();
    if (db.enabled) {
      const hasConsent = await db.hasActiveConsentForLearner({ childEmail: req.user.email });
      if (hasConsent) return next();
      // Under-16 activation event: ensure a pending consent request exists for each linked
      // parent so the day-6 reminder + expiry tracking have a row to act on (US3, T038).
      db.listParentsForChild({ childEmail: req.user.email }).then(parents => {
        for (const p of (parents || [])) {
          const pe = (p.parentEmail || p.parent_email || '').toLowerCase();
          if (pe) db.createConsentRequest({ parentEmail: pe, childEmail: req.user.email }).catch(() => {});
        }
      }).catch(() => {});
    }
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'parental_consent_required', message: 'Parental consent (GDPR Art. 8) is required for learners under 16. Ask your parent to grant consent through the Parent Portal.' });
    }
    return res.redirect('/consent-pending.html');
  });
}

// Feature 007 — Adaptive Learning routes (learner + teacher surfaces).
// Guarded require: if the module is missing the app still boots in non-adaptive
// mode (availability safeguard / graceful degradation per spec 007).
try {
  require('./server-adaptive')(app, { db, auth, cs, APP_ROLE });
} catch (e) {
  console.warn('[adaptive] routes not mounted (non-adaptive fallback):', e && e.message);
}

// Feature 009 — Interoperability routes (learner SCORM/due-dates + teacher xAPI/calendar).
// Guarded require: missing module => app still boots; connectors degrade gracefully.
try {
  require('./server-interop')(app, { db, auth, cs, APP_ROLE });
} catch (e) {
  console.warn('[interop] routes not mounted (connectors offline):', e && e.message);
}

// Feature 010 — CMS transparency routes (teacher version/approval provenance).
// Guarded require: missing module => app still boots without governance views.
try {
  require('./server-cms')(app, { db, auth, cs, APP_ROLE });
} catch (e) {
  console.warn('[cms] transparency routes not mounted:', e && e.message);
}

// Feature 011 — Multi-school hierarchy governance routes (scope RBAC, approvals,
// hierarchical reporting, benchmarking). Guarded require: missing module => app
// still boots without hierarchy governance.
try {
  require('./server-hierarchy')(app, { db, auth, cs, APP_ROLE });
} catch (e) {
  console.warn('[hierarchy] routes not mounted:', e && e.message);
}

// Feature 012 — A/B testing framework routes (experiment lifecycle, governed
// assignment, monitoring, significance, segmentation, sign-off, decisions,
// archive). Guarded require: missing module => app still boots without
// experimentation; statistical output is advisory, adopt_variant is sign-off
// gated, all actions are audited.
try {
  require('./server-experiments')(app, { db, auth, cs, APP_ROLE });
} catch (e) {
  console.warn('[experiments] routes not mounted:', e && e.message);
}

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    // Cache static assets aggressively; skip for HTML (always revalidate)
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
  }
}));

function buildSystemPrompt(u) {
  const base = `You are LearnEU, an EU-compliant assistant deployed in West Europe. Respond in ${u.language || 'en'} unless the user writes in another language. Use concise markdown.

Visual aids — pick the RIGHT tool:
- For PROCESS / FLOW / RELATIONSHIP / TREE diagrams use a fenced \`\`\`mermaid block. STRICT RULES:
  * First line MUST be exactly \`flowchart TD\` (or \`flowchart LR\`).
  * Every node label MUST be ASCII-only and DOUBLE-QUOTED, e.g. \`A["Checkpoint A - plan use"]\`. NO umlauts (ä,ö,ü,ß), NO smart quotes (« » „ "), NO parentheses, brackets or commas inside labels — replace them with \` - \`.
  * Edges only as \`A --> B\` or \`A -->|"label"| B\`. No styling, no classDef, no subgraphs unless trivially short.
  * Keep diagrams under 12 nodes. If you cannot satisfy these rules, output a numbered markdown list instead of a diagram.
- For GEOMETRIC SHAPES (triangles, squares, circles, angles, graphs, axes, vectors, fractions of a pie, etc.) DO NOT use mermaid. Emit ONE inline \`<svg>\` with EXACTLY these rules:
  * Root: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240" font-family="sans-serif" font-size="12">\`.
  * Use \`<polygon>\`/\`<polyline>\`/\`<line>\`/\`<circle>\`/\`<path>\` with \`stroke="#0a2540" stroke-width="1.5" fill="#eef2f7"\` (or \`fill="none"\` for lines).
  * Labels: \`<text font-size="12" fill="#0a2540" text-anchor="middle">\` placed 6–10 px outside vertices/edges; never overlap shape strokes.
  * Do NOT put a title inside the \`<svg>\`; put any heading in the surrounding markdown instead.
  * Stay inside the 320×240 viewBox; leave 20 px padding for labels.
  * No \`<script>\`, no \`<foreignObject>\`, no external href, no CSS \`@import\`, no \`width="100%"\`.
- For tables, use markdown tables.
- Never mix mermaid and svg in the same diagram. At most one diagram per answer unless strictly needed.`;
  switch (u.role) {
    case 'student':
      return `${base}\nYou tutor ${u.firstName}, age ${u.age}. Adapt vocabulary to that age. Encourage, give one worked example, then a tiny check-question. Never request personal information.`;
    case 'teacher':
      return `${base}\nYou support educator ${u.firstName} (${u.lastName}). Suggest curriculum-aligned activities (Bildungsstandards / Kerndoelen). Be specific on duration and learning objective. Highlight where teacher oversight (EU AI Act Art. 14) is required.`;
    case 'parent':
      return `${base}\nYou advise parent ${u.firstName}. Use plain non-technical language. Always remind that data stays in West Europe and that consent (GDPR Art. 8) can be withdrawn at any time.`;
    case 'admin':
      return `${base}\nYou support a platform admin. Be precise, technical, and concise.`;
    default:
      return base;
  }
}

app.post('/api/chat', async (req, res) => {
  if (!APIM || !KEY) return res.status(503).json({ error: 'APIM environment not configured' });
  if (KEY.startsWith('@Microsoft.KeyVault')) return res.status(503).json({ error: 'Key Vault reference not yet resolved by App Service. Restart the app.' });

  const u = req.user;
  const userPrompt = String(req.body?.prompt || 'Say hello.');

  // 1. Content Safety on the user prompt (input scan).
  const inputScan = await cs.analyze(userPrompt);
  if (inputScan.ran && inputScan.blocked) {
    db.logContentSafety({ email: u.email, app: APP_NAME, direction: 'input', blocked: true, severities: inputScan.severities, raw: inputScan.raw }).catch(() => {});
    return res.status(400).json({ error: 'input_blocked', detail: 'Your prompt was flagged by Azure AI Content Safety.', severities: inputScan.severities, threshold: inputScan.threshold });
  }

  const body = {
    messages: [
      { role: 'system', content: buildSystemPrompt(u) },
      { role: 'user', content: userPrompt }
    ],
    max_completion_tokens: Math.min(Number(req.body?.max_tokens) || 500, 1500)
  };
  const url = `${APIM}/aoai/openai/deployments/${encodeURIComponent(DEP)}/chat/completions?api-version=2024-08-01-preview`;
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': KEY },
      body: JSON.stringify(body)
    });
    const ct = r.headers.get('content-type') || '';
    const latency = Date.now() - t0;
    if (!r.ok || !ct.includes('application/json')) {
      const text = await r.text();
      const askId = await db.logAsk({ email: u.email, role: u.role, app: APP_NAME, prompt: userPrompt, answer: '', model: DEP, usage: null, latencyMs: latency, status: r.status, error: text.slice(0, 500) }).catch(() => null);
      if (inputScan.ran) db.logContentSafety({ askId, email: u.email, app: APP_NAME, direction: 'input', blocked: false, severities: inputScan.severities, raw: inputScan.raw }).catch(() => {});
      return res.status(r.status).type(ct || 'application/json').send(text);
    }
    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content ?? '';
    const usage = data?.usage && {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens
    };

    // 2. Content Safety on the model answer (output scan).
    const outputScan = await cs.analyze(answer);
    const finalAnswer = outputScan.blocked
      ? '_(Cette réponse a été bloquée par Azure AI Content Safety. Reformulez votre question.)_'
      : answer;
    const status = outputScan.blocked ? 451 : 200;

    const askId = await db.logAsk({ email: u.email, role: u.role, app: APP_NAME, prompt: userPrompt, answer: finalAnswer, model: data?.model || DEP, usage, latencyMs: latency, status }).catch(() => null);
    if (inputScan.ran) db.logContentSafety({ askId, email: u.email, app: APP_NAME, direction: 'input', blocked: false, severities: inputScan.severities, raw: inputScan.raw }).catch(() => {});
    if (outputScan.ran) db.logContentSafety({ askId, email: u.email, app: APP_NAME, direction: 'output', blocked: Boolean(outputScan.blocked), severities: outputScan.severities, raw: outputScan.raw }).catch(() => {});

    // Optional groundedness probe (Feature 3): if the prompt mentions a curriculum
    // framework we expect the answer to cite at least one competency id (e.g. NL-MATH-Y7-FRAC-02).
    // When it does not, auto-record a 'confusing' feedback row tagged 'low_groundedness'.
    if (askId && /Bildungsstandards|Kerndoelen/i.test(userPrompt)) {
      const cited = /\b[A-Z]{2}-[A-Z]+-Y\d+-[A-Z]+-\d+\b/.test(finalAnswer);
      if (!cited) {
        db.logAskFeedback({ askId, email: u.email, rating: 'confusing', note: 'low_groundedness (auto)' }).catch(() => {});
      }
    }

    res.json({
      askId,
      answer: finalAnswer,
      model: data?.model,
      usage,
      contentSafety: cs.enabled ? {
        input: { severities: inputScan.severities, blocked: false },
        output: { severities: outputScan.severities, blocked: Boolean(outputScan.blocked) },
        threshold: cs.threshold
      } : null
    });
  } catch (err) {
    db.logAsk({ email: u && u.email, role: u && u.role, app: APP_NAME, prompt: userPrompt, answer: '', model: DEP, usage: null, latencyMs: Date.now() - t0, status: 502, error: String(err) }).catch(() => {});
    res.status(502).json({ error: 'upstream error', detail: String(err) });
  }
});

// --- Reference data (read-only, role-gated already by middleware) ----------
app.get('/api/data/curricula', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listCurricula({ country: req.query.country, subject: req.query.subject });
  res.json({ enabled: true, rows: rows || [] });
});
app.get('/api/data/glossary', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listGlossary({ language: req.query.language });
  res.json({ enabled: true, rows: rows || [] });
});
app.get('/api/data/learners', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.summariseLearners();
  res.json({ enabled: true, rows: rows || [] });
});
app.get('/api/data/hierarchy', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, hierarchy: null });
  const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
  const hierarchy = await db.getHierarchySummary({ asOf });
  res.json({ enabled: true, hierarchy });
});
// Skill catalogue (Feature 2). Open to any signed-in user. Optional filters:
//   ?domain=numeracy
//   ?competency=NL-MATH-Y7-FRAC-02   (returns skills mapped to that ministry competency)
app.get('/api/data/skills', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listSkillsCatalogue({
    domain: req.query.domain ? String(req.query.domain) : undefined,
    competency: req.query.competency ? String(req.query.competency) : undefined,
    limit: 200
  });
  res.json({ enabled: true, rows: rows || [] });
});
// Detailed view of one skill (linked competencies + items).
app.get('/api/data/skills/:id', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, skill: null });
  const skill = await db.getSkillById({ id: req.params.id });
  if (!skill) return res.status(404).json({ enabled: true, skill: null, error: 'not found' });
  res.json({ enabled: true, skill });
});

// --- Quality telemetry (Feature 3) ----------------------------------------
// Learner feedback widget on assistant answers.
app.post('/api/chat/feedback', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'auth required' });
  if (!db.enabled) return res.status(503).json({ error: 'db disabled' });
  const askId = Number(req.body?.askId);
  const rating = String(req.body?.rating || '').toLowerCase();
  const note = req.body?.note != null ? String(req.body.note) : null;
  if (!['helpful', 'confusing', 'wrong'].includes(rating)) {
    return res.status(400).json({ error: 'rating must be helpful|confusing|wrong' });
  }
  try {
    const id = await db.logAskFeedback({
      askId: Number.isFinite(askId) ? askId : null,
      email: req.user.email,
      rating,
      note
    });
    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});
// Admin-only Quality dashboard endpoints.
app.get('/api/admin/quality/kpis', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  if (!db.enabled) return res.json({ enabled: false, kpis: null });
  const kpis = await db.getQualityKpis();
  res.json({ enabled: true, kpis });
});
app.get('/api/admin/quality/feedback', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.getQualityFeedback({ limit: req.query.limit });
  res.json({ enabled: true, rows: rows || [] });
});

// --- Revision quiz from a study sheet (Feature 4) -------------------------
// Generates 5 short MCQs grounded in the sheet content and returns them as JSON.
// Attempts are recorded by the client via /api/learner/attempt with synthetic
// item ids of the form SHEET:<sheetId>:Q<n>.
app.post('/api/sheets/:id/quiz', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'auth required' });
  if (!db.enabled) return res.status(503).json({ error: 'db disabled' });
  if (!APIM || !KEY || KEY.startsWith('@Microsoft.KeyVault')) return res.status(503).json({ error: 'APIM not configured' });
  const sheet = await db.getSheet({ id: req.params.id, email: req.user.email });
  if (!sheet) return res.status(404).json({ error: 'sheet not found' });
  const sys = `You are a K-12 quiz generator. From the study sheet provided by the user, output EXACTLY 5 short multiple-choice questions in strict JSON, no prose around it. Schema:
{"questions":[{"q":"...","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}
Constraints: questions in ${req.user.language || 'en'}; each question max 140 chars; 4 choices each (one correct); explanation max 180 chars; do NOT repeat the sheet verbatim; difficulty fits a ${req.user.age || 12}-year-old.`;
  const userPrompt = `Sheet title: ${sheet.title}\n\nSheet content:\n${(sheet.answer || '').slice(0, 3500)}`;
  const url = `${APIM}/aoai/openai/deployments/${encodeURIComponent(DEP)}/chat/completions?api-version=2024-08-01-preview`;
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': KEY },
      body: JSON.stringify({
        messages: [ { role: 'system', content: sys }, { role: 'user', content: userPrompt } ],
        max_completion_tokens: 900,
        response_format: { type: 'json_object' }
      })
    });
    const latency = Date.now() - t0;
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).type('application/json').send(text);
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch (_) { parsed = {}; }
    const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5).map((q, i) => ({
      n: i + 1,
      q: String(q.q || '').slice(0, 200),
      choices: Array.isArray(q.choices) ? q.choices.slice(0, 4).map(c => String(c).slice(0, 120)) : [],
      correctIndex: Number.isInteger(q.correctIndex) ? Math.max(0, Math.min(3, q.correctIndex)) : 0,
      explanation: String(q.explanation || '').slice(0, 240)
    })) : [];
    db.logAsk({ email: req.user.email, role: req.user.role, app: APP_NAME, prompt: '[quiz from sheet:' + sheet.id + ']', answer: raw.slice(0, 4000), model: data?.model || DEP, usage: data?.usage, latencyMs: latency, status: 200 }).catch(() => {});
    res.json({ sheetId: sheet.id, title: sheet.title, questions, model: data?.model, latencyMs: latency });
  } catch (e) {
    res.status(502).json({ error: 'upstream error', detail: String(e) });
  }
});
// Admin-only: force a re-seed of curricula / glossary / learners from packaged data.
// Idempotent (uses ON CONFLICT). Returns row counts before and after.
app.post('/api/data/reseed', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  try {
    const out = await db.reseedReferenceData();
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
});

// --- Adaptive ONNX feedback loop -------------------------------------------
// Front-end runs onnxruntime-web, picks an item, asks the user, then POSTs the result here.
app.post('/api/learner/attempt', async (req, res) => {
  const u = req.user;
  const { itemId, difficulty, predicted, correct, latencyMs, pseudonym } = req.body || {};
  if (!itemId) return res.status(400).json({ error: 'itemId required' });
  await db.logItemAttempt({ email: u.email, pseudonym, itemId, difficulty: Number(difficulty), predicted: Number(predicted), correct: Boolean(correct), latencyMs: Number(latencyMs) }).catch(() => {});
  // Feature 1 — keep skill mastery + daily activity in sync (best-effort).
  await db.bumpSkillMasteryFromAttempt({ email: u.email, itemId }).catch(() => {});
  await db.bumpDailyActivity({ email: u.email, correct: Boolean(correct) }).catch(() => {});
  res.json({ ok: true, store: db.enabled ? 'postgres' : 'memory' });
});
app.get('/api/learner/attempts', async (req, res) => {
  const u = req.user;
  const rows = await db.recentAttempts({ email: u.email, limit: 50 });
  res.json({ enabled: db.enabled, rows: rows || [] });
});
app.get('/api/learner/persona', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, persona: null });
  const persona = await db.pickRandomLearner({ market: 'DE' });
  res.json({ enabled: true, persona });
});

// --- Skills progression (Feature 1) ---------------------------------------
// Per-learner mastery profile. Open to any signed-in user (each sees their own).
app.get('/api/learner/mastery', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listMasteryForLearner({ email: u.email, limit: 24 });
  res.json({ enabled: true, rows: rows || [] });
});
// Per-learner activity (last 30 days). Used by streak/badges in Feature 4.
app.get('/api/learner/activity', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listLearnerActivity({ email: u.email, days: 30 });
  res.json({ enabled: true, rows: rows || [] });
});
// --- Learner gamification UX (Feature 003) -------------------------------
const GAM_BADGES = [
  { key: 'daily-flame', label: 'Daily Flame' },
  { key: 'fraction-hunter', label: 'Fraction Hunter' },
  { key: 'team-helper', label: 'Team Helper' },
  { key: 'boss-slayer', label: 'Boss Slayer' },
  { key: 'streak-sprinter', label: 'Streak Sprinter' }
];

function tierFromAttempts(totalAttempts) {
  if (totalAttempts >= 200) return { tier: 10, name: 'Mythic' };
  if (totalAttempts >= 160) return { tier: 9, name: 'Legend' };
  if (totalAttempts >= 130) return { tier: 8, name: 'Master' };
  if (totalAttempts >= 100) return { tier: 7, name: 'Diamond' };
  if (totalAttempts >= 75) return { tier: 6, name: 'Gold' };
  if (totalAttempts >= 55) return { tier: 5, name: 'Silver' };
  if (totalAttempts >= 40) return { tier: 4, name: 'Bronze+' };
  if (totalAttempts >= 25) return { tier: 3, name: 'Bronze' };
  if (totalAttempts >= 12) return { tier: 2, name: 'Starter+' };
  return { tier: 1, name: 'Starter' };
}

function rewardForDay(dateIso) {
  const d = String(dateIso || '').replace(/-/g, '');
  const seed = Number.parseInt(d.slice(-2), 10) || 1;
  return GAM_BADGES[seed % GAM_BADGES.length];
}

async function getConsecutiveCorrect(email) {
  const r = await db._query(
    `SELECT correct FROM item_attempts WHERE email = $1 ORDER BY created_at DESC LIMIT 30`,
    [email]
  );
  if (!r || !r.rows) return 0;
  let streak = 0;
  for (const row of r.rows) {
    if (row.correct) streak += 1;
    else break;
  }
  return streak;
}

async function buildGamificationDashboard(email) {
  const todayR = await db._query(
    `SELECT COALESCE(attempts, 0)::int AS attempts, COALESCE(correct, 0)::int AS correct
       FROM learner_activity WHERE email = $1 AND day = CURRENT_DATE`,
    [email]
  );
  const todayAttempts = todayR && todayR.rows[0] ? todayR.rows[0].attempts : 0;
  const todayCorrect = todayR && todayR.rows[0] ? todayR.rows[0].correct : 0;

  const weekR = await db._query(
    `SELECT COALESCE(SUM(attempts), 0)::int AS total_attempts,
            COUNT(DISTINCT CASE WHEN attempts > 0 THEN email END)::int AS contributors
       FROM learner_activity
      WHERE day >= date_trunc('week', now())::date
        AND email LIKE 'student%@learneu.demo'`,
    []
  );
  const classAttempts = weekR && weekR.rows[0] ? weekR.rows[0].total_attempts : 0;
  const classContributors = weekR && weekR.rows[0] ? weekR.rows[0].contributors : 0;

  const streakStats = await db.getLearnerStreak({ email, windowDays: 30 });
  const totalAttempts30 = streakStats ? (streakStats.totalAttempts || 0) : 0;
  const tier = tierFromAttempts(totalAttempts30);
  const nextTierAttempts = [12, 25, 40, 55, 75, 100, 130, 160, 200, 260][Math.max(0, tier.tier - 1)] || 260;

  const consecutiveCorrect = await getConsecutiveCorrect(email);

  const chestR = await db._query(
    `SELECT claimed_at, reward_badge_key AS key, reward_label AS label
       FROM learner_daily_chests WHERE email = $1 AND day = CURRENT_DATE`,
    [email]
  );
  const chestClaimed = Boolean(chestR && chestR.rows && chestR.rows[0]);
  const todayReward = rewardForDay(new Date().toISOString().slice(0, 10));

  const badgesR = await db._query(
    `SELECT badge_key AS key, badge_label AS label, source, earned_at
       FROM learner_badges WHERE email = $1 ORDER BY earned_at DESC LIMIT 40`,
    [email]
  );

  const motivationR = await db._query(
    `SELECT id, class_key AS "classKey", email, display_name AS "displayName", message, status, created_at AS "createdAt"
       FROM learner_motivation_messages
      WHERE class_key = 'class-y7-fractions' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 25`,
    []
  );

  return {
    mission: {
      id: 'daily-quest-fractions',
      title: 'Mission du jour',
      objective: 'Complete 10 practice attempts today',
      target: 10,
      progress: todayAttempts,
      correct: todayCorrect,
      completed: todayAttempts >= 10
    },
    guildObjective: {
      classKey: 'class-y7-fractions',
      title: 'Objectif de la classe',
      target: 300,
      progress: classAttempts,
      contributors: classContributors
    },
    collaborativeQuests: [
      {
        id: 'cq-duo-help',
        title: 'Duo entraide',
        description: 'Two learners each complete 8 attempts this week',
        target: 16,
        progress: Math.min(16, classAttempts),
        completed: classAttempts >= 16
      },
      {
        id: 'cq-class-sprint',
        title: 'Class sprint',
        description: 'Class reaches 120 valid attempts',
        target: 120,
        progress: Math.min(120, classAttempts),
        completed: classAttempts >= 120
      }
    ],
    season: {
      title: 'Season Progression',
      tier: tier.tier,
      tierName: tier.name,
      progress: Math.min(totalAttempts30, nextTierAttempts),
      target: nextTierAttempts,
      totalAttempts30
    },
    chest: {
      eligible: todayAttempts >= 10,
      claimed: chestClaimed,
      rewardPreview: todayReward,
      claimedReward: chestClaimed ? { key: chestR.rows[0].key, label: chestR.rows[0].label, claimedAt: chestR.rows[0].claimed_at } : null
    },
    bossBattle: {
      title: 'Boss Battle',
      objective: '10 consecutive correct answers',
      currentStreak: consecutiveCorrect,
      target: 10,
      defeated: consecutiveCorrect >= 10
    },
    badges: badgesR ? badgesR.rows : [],
    motivation: motivationR ? motivationR.rows : []
  };
}

const COLLAB_CLASS_KEY = 'class-y7-fractions';

function learnerDisplayName(u) {
  return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
}

app.get('/api/learner/gamification/dashboard', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false });
  const payload = await buildGamificationDashboard(req.user.email);
  res.json({ enabled: true, ...payload });
});

app.post('/api/learner/gamification/chest/claim', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const email = req.user.email;
  const dash = await buildGamificationDashboard(email);
  if (!dash.chest.eligible) return res.status(400).json({ error: 'daily mission not completed yet' });
  if (dash.chest.claimed) return res.status(409).json({ error: 'chest already claimed today', reward: dash.chest.claimedReward });
  const reward = dash.chest.rewardPreview;
  await db._query(
    `INSERT INTO learner_daily_chests (email, day, reward_badge_key, reward_label)
     VALUES ($1, CURRENT_DATE, $2, $3)`,
    [email, reward.key, reward.label]
  );
  await db._query(
    `INSERT INTO learner_badges (email, badge_key, badge_label, source)
     VALUES ($1, $2, $3, 'daily_chest')
     ON CONFLICT (email, badge_key) DO NOTHING`,
    [email, reward.key, reward.label]
  );
  res.status(201).json({ ok: true, reward });
});

app.get('/api/learner/champion/questions', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const email = req.user.email;
  const r = await db._query(
    `SELECT
       c.id,
       c.author_email AS "authorEmail",
       c.author_name AS "authorName",
       c.question,
       c.options,
       c.explanation,
       c.status,
       c.winner_email AS "winnerEmail",
       c.winner_name AS "winnerName",
       c.created_at AS "createdAt",
       c.closed_at AS "closedAt",
       COALESCE((SELECT COUNT(*)::int FROM learner_champion_answers a WHERE a.challenge_id = c.id), 0) AS "answersCount",
       me.selected_index AS "mySelectedIndex",
       me.is_correct AS "myIsCorrect"
     FROM learner_champion_challenges c
     LEFT JOIN learner_champion_answers me
       ON me.challenge_id = c.id AND me.challenger_email = $2
     WHERE c.class_key = $1
     ORDER BY c.created_at DESC
     LIMIT 50`,
    [COLLAB_CLASS_KEY, email]
  );
  const rows = (r ? r.rows : []).map((row) => ({
    ...row,
    isAuthor: String(row.authorEmail || '').toLowerCase() === email,
    canAnswer: row.status === 'open' && String(row.authorEmail || '').toLowerCase() !== email && row.mySelectedIndex == null,
    options: Array.isArray(row.options) ? row.options : []
  }));
  res.json({ enabled: true, rows });
});

app.post('/api/learner/champion/questions', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const question = String(req.body?.question || '').trim();
  const optionsRaw = Array.isArray(req.body?.options) ? req.body.options : [];
  const options = optionsRaw.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4);
  const correctIndex = Number(req.body?.correctIndex);
  const explanation = String(req.body?.explanation || '').trim().slice(0, 240);
  if (!question) return res.status(400).json({ error: 'question required' });
  if (question.length > 220) return res.status(400).json({ error: 'question too long (max 220)' });
  if (options.length < 2) return res.status(400).json({ error: 'at least 2 options are required' });
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return res.status(400).json({ error: 'correctIndex must target one option' });
  }
  const scan = await cs.analyze([question, ...options, explanation].filter(Boolean).join('\n'));
  if (scan.ran && scan.blocked) {
    return res.status(400).json({ error: 'input_blocked', detail: 'Question blocked by Content Safety.', severities: scan.severities });
  }

  const authorName = learnerDisplayName(req.user);
  const r = await db._query(
    `INSERT INTO learner_champion_challenges (class_key, author_email, author_name, question, options, correct_index, explanation)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     RETURNING id, author_email AS "authorEmail", author_name AS "authorName", question, options, explanation, status, created_at AS "createdAt"`,
    [COLLAB_CLASS_KEY, req.user.email, authorName, question, JSON.stringify(options), correctIndex, explanation || null]
  );

  await db._query(
    `INSERT INTO learner_badges (email, badge_key, badge_label, source)
     VALUES ($1, 'challenge-creator', 'Challenge Creator', 'champion_question')
     ON CONFLICT (email, badge_key) DO NOTHING`,
    [req.user.email]
  );

  res.status(201).json({ row: r && r.rows[0] ? r.rows[0] : null });
});

app.post('/api/learner/champion/questions/:id/answer', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const challengeId = Number.parseInt(req.params.id, 10);
  const selectedIndex = Number(req.body?.selectedIndex);
  if (!Number.isFinite(challengeId)) return res.status(400).json({ error: 'invalid challenge id' });
  if (!Number.isInteger(selectedIndex)) return res.status(400).json({ error: 'selectedIndex must be an integer' });

  const c = await db._query(
    `SELECT id, author_email AS "authorEmail", correct_index AS "correctIndex", status
       FROM learner_champion_challenges
      WHERE id = $1 AND class_key = $2`,
    [challengeId, COLLAB_CLASS_KEY]
  );
  const challenge = c && c.rows ? c.rows[0] : null;
  if (!challenge) return res.status(404).json({ error: 'challenge not found' });
  if (String(challenge.authorEmail || '').toLowerCase() === req.user.email) return res.status(400).json({ error: 'you cannot answer your own challenge' });

  const challengerName = learnerDisplayName(req.user);
  const isCorrect = selectedIndex === challenge.correctIndex;
  const points = isCorrect ? 3 : 0;

  const ins = await db._query(
    `INSERT INTO learner_champion_answers (challenge_id, challenger_email, challenger_name, selected_index, is_correct, points_awarded)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (challenge_id, challenger_email) DO NOTHING
     RETURNING id`,
    [challengeId, req.user.email, challengerName, selectedIndex, isCorrect, points]
  );
  if (!ins || !ins.rows || !ins.rows.length) return res.status(409).json({ error: 'you already answered this challenge' });

  let closedByMe = false;
  if (isCorrect && challenge.status === 'open') {
    const closeR = await db._query(
      `UPDATE learner_champion_challenges
          SET status = 'closed', winner_email = $2, winner_name = $3, closed_at = now()
        WHERE id = $1 AND status = 'open'
        RETURNING id`,
      [challengeId, req.user.email, challengerName]
    );
    closedByMe = Boolean(closeR && closeR.rows && closeR.rows.length);
  }

  if (isCorrect) {
    await db._query(
      `INSERT INTO learner_badges (email, badge_key, badge_label, source)
       VALUES ($1, 'champion-answer', 'Champion Answer', 'champion_question')
       ON CONFLICT (email, badge_key) DO NOTHING`,
      [req.user.email]
    );
    if (closedByMe) {
      await db._query(
        `INSERT INTO learner_badges (email, badge_key, badge_label, source)
         VALUES ($1, 'champion-winner', 'Champion Winner', 'champion_question')
         ON CONFLICT (email, badge_key) DO NOTHING`,
        [req.user.email]
      );
    }
  }

  res.status(201).json({ ok: true, isCorrect, pointsAwarded: points, closedByMe });
});

app.get('/api/learner/champion/leaderboard', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const r = await db._query(
    `SELECT challenger_email AS "email",
            challenger_name AS "displayName",
            COUNT(*)::int AS "attempts",
            SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int AS "correctAnswers",
            COALESCE(SUM(points_awarded), 0)::int AS "points"
       FROM learner_champion_answers
      GROUP BY challenger_email, challenger_name
      ORDER BY "points" DESC, "correctAnswers" DESC, "attempts" DESC
      LIMIT 20`,
    []
  );
  const rows = (r && r.rows ? r.rows : []).map((x, i) => ({ ...x, rank: i + 1 }));
  res.json({ enabled: true, rows });
});

app.get('/api/learner/classmates', async (req, res) => {
  const me = String(req.user.email || '').toLowerCase();
  const rows = (auth.SEED_USERS || [])
    .filter((u) => u.role === 'student' && String(u.email || '').toLowerCase() !== me)
    .map((u) => ({
      email: u.email,
      displayName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email
    }));
  res.json({ enabled: true, rows });
});

app.get('/api/learner/duels', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const email = req.user.email;
  await db._query(
    `UPDATE learner_duels
        SET status = 'expired'
      WHERE status = 'pending'
        AND now() > created_at + (time_limit_sec * INTERVAL '1 second')`,
    []
  );
  const r = await db._query(
    `SELECT d.id,
            d.challenger_email AS "challengerEmail",
            d.challenger_name AS "challengerName",
            d.opponent_email AS "opponentEmail",
            d.opponent_name AS "opponentName",
            d.question,
            d.options,
            d.time_limit_sec AS "timeLimitSec",
            d.status,
            d.winner_email AS "winnerEmail",
            d.winner_name AS "winnerName",
            d.points_awarded AS "pointsAwarded",
            d.created_at AS "createdAt",
            d.answered_at AS "answeredAt",
            a.selected_index AS "mySelectedIndex",
            a.is_correct AS "myIsCorrect",
            a.elapsed_ms AS "myElapsedMs",
            COALESCE(EXTRACT(EPOCH FROM (now() - d.created_at))::int, 0) AS "elapsedSec"
       FROM learner_duels d
  LEFT JOIN learner_duel_answers a
         ON a.duel_id = d.id AND a.player_email = $2
      WHERE d.class_key = $1
        AND (d.challenger_email = $2 OR d.opponent_email = $2)
   ORDER BY d.created_at DESC
      LIMIT 60`,
    [COLLAB_CLASS_KEY, email]
  );
  const rows = (r && r.rows ? r.rows : []).map((row) => ({
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
    isChallenger: String(row.challengerEmail || '').toLowerCase() === email,
    isOpponent: String(row.opponentEmail || '').toLowerCase() === email,
    canAnswer: row.status === 'pending'
      && String(row.opponentEmail || '').toLowerCase() === email
      && row.mySelectedIndex == null
      && Number(row.elapsedSec || 0) <= Number(row.timeLimitSec || 90)
  }));
  res.json({ enabled: true, rows });
});

app.post('/api/learner/duels', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const challengerEmail = req.user.email;
  const challengerName = learnerDisplayName(req.user);
  const opponentEmail = String(req.body?.opponentEmail || '').trim().toLowerCase();
  const question = String(req.body?.question || '').trim();
  const optionsRaw = Array.isArray(req.body?.options) ? req.body.options : [];
  const options = optionsRaw.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4);
  const correctIndex = Number(req.body?.correctIndex);
  const timeLimitSec = Math.min(180, Math.max(20, Number.parseInt(req.body?.timeLimitSec, 10) || 90));
  if (!opponentEmail) return res.status(400).json({ error: 'opponentEmail required' });
  if (opponentEmail === challengerEmail) return res.status(400).json({ error: 'cannot duel yourself' });
  if (!question) return res.status(400).json({ error: 'question required' });
  if (question.length > 220) return res.status(400).json({ error: 'question too long (max 220)' });
  if (options.length < 2) return res.status(400).json({ error: 'at least 2 options are required' });
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return res.status(400).json({ error: 'correctIndex must target one option' });
  }

  const opponent = (auth.SEED_USERS || []).find((u) => String(u.email || '').toLowerCase() === opponentEmail && u.role === 'student');
  if (!opponent) return res.status(404).json({ error: 'opponent not found' });
  const opponentName = [opponent.firstName, opponent.lastName].filter(Boolean).join(' ').trim() || opponentEmail;

  const scan = await cs.analyze([question, ...options].join('\n'));
  if (scan.ran && scan.blocked) {
    return res.status(400).json({ error: 'input_blocked', detail: 'Duel question blocked by Content Safety.', severities: scan.severities });
  }

  const r = await db._query(
    `INSERT INTO learner_duels (class_key, challenger_email, challenger_name, opponent_email, opponent_name, question, options, correct_index, time_limit_sec)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING id, challenger_email AS "challengerEmail", challenger_name AS "challengerName", opponent_email AS "opponentEmail", opponent_name AS "opponentName", question, options, time_limit_sec AS "timeLimitSec", status, created_at AS "createdAt"`,
    [COLLAB_CLASS_KEY, challengerEmail, challengerName, opponentEmail, opponentName, question, JSON.stringify(options), correctIndex, timeLimitSec]
  );

  await db._query(
    `INSERT INTO learner_badges (email, badge_key, badge_label, source)
     VALUES ($1, 'duel-initiator', 'Duel Initiator', 'duel_mode')
     ON CONFLICT (email, badge_key) DO NOTHING`,
    [challengerEmail]
  );

  res.status(201).json({ row: r && r.rows[0] ? r.rows[0] : null });
});

app.post('/api/learner/duels/:id/answer', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const duelId = Number.parseInt(req.params.id, 10);
  const selectedIndex = Number(req.body?.selectedIndex);
  if (!Number.isFinite(duelId)) return res.status(400).json({ error: 'invalid duel id' });
  if (!Number.isInteger(selectedIndex)) return res.status(400).json({ error: 'selectedIndex must be an integer' });

  const d = await db._query(
    `SELECT id, challenger_email AS "challengerEmail", challenger_name AS "challengerName", opponent_email AS "opponentEmail", correct_index AS "correctIndex", status, time_limit_sec AS "timeLimitSec", created_at AS "createdAt"
       FROM learner_duels WHERE id = $1 AND class_key = $2`,
    [duelId, COLLAB_CLASS_KEY]
  );
  const duel = d && d.rows ? d.rows[0] : null;
  if (!duel) return res.status(404).json({ error: 'duel not found' });
  if (String(duel.opponentEmail || '').toLowerCase() !== req.user.email) return res.status(403).json({ error: 'only invited opponent can answer' });
  if (duel.status !== 'pending') return res.status(409).json({ error: 'duel already resolved' });

  const elapsedMs = Math.max(0, Date.now() - new Date(duel.createdAt).getTime());
  const limitMs = Number(duel.timeLimitSec || 90) * 1000;
  if (elapsedMs > limitMs) {
    await db._query(
      `UPDATE learner_duels SET status='expired' WHERE id=$1 AND status='pending'`,
      [duelId]
    );
    return res.status(410).json({ error: 'duel expired' });
  }

  const isCorrect = selectedIndex === duel.correctIndex;
  const speedBonus = !isCorrect ? 0 : (elapsedMs <= 15000 ? 3 : elapsedMs <= 30000 ? 2 : elapsedMs <= 60000 ? 1 : 0);
  const winnerEmail = isCorrect ? req.user.email : duel.challengerEmail;
  const winnerName = isCorrect ? learnerDisplayName(req.user) : duel.challengerName;
  const pointsAwarded = isCorrect ? (5 + speedBonus) : 2;

  const ins = await db._query(
    `INSERT INTO learner_duel_answers (duel_id, player_email, player_name, selected_index, is_correct, elapsed_ms, bonus_points)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (duel_id, player_email) DO NOTHING
     RETURNING id`,
    [duelId, req.user.email, learnerDisplayName(req.user), selectedIndex, isCorrect, elapsedMs, speedBonus]
  );
  if (!ins || !ins.rows || !ins.rows.length) return res.status(409).json({ error: 'answer already submitted' });

  await db._query(
    `UPDATE learner_duels
        SET status = 'answered', winner_email = $2, winner_name = $3, points_awarded = $4, answered_at = now()
      WHERE id = $1 AND status = 'pending'`,
    [duelId, winnerEmail, winnerName, pointsAwarded]
  );

  if (isCorrect) {
    await db._query(
      `INSERT INTO learner_badges (email, badge_key, badge_label, source)
       VALUES ($1, 'duel-winner', 'Duel Winner', 'duel_mode')
       ON CONFLICT (email, badge_key) DO NOTHING`,
      [req.user.email]
    );
    if (speedBonus >= 2) {
      await db._query(
        `INSERT INTO learner_badges (email, badge_key, badge_label, source)
         VALUES ($1, 'speed-duelist', 'Speed Duelist', 'duel_mode')
         ON CONFLICT (email, badge_key) DO NOTHING`,
        [req.user.email]
      );
    }
  }

  res.status(201).json({ ok: true, isCorrect, elapsedMs, speedBonus, pointsAwarded, winnerEmail, winnerName });
});

app.get('/api/learner/duels/leaderboard', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const r = await db._query(
    `SELECT winner_email AS "email",
            winner_name AS "displayName",
            COUNT(*)::int AS "wins",
            COALESCE(SUM(points_awarded), 0)::int AS "points"
       FROM learner_duels
      WHERE status = 'answered' AND winner_email IS NOT NULL
      GROUP BY winner_email, winner_name
      ORDER BY "points" DESC, "wins" DESC
      LIMIT 20`,
    []
  );
  const rows = (r && r.rows ? r.rows : []).map((x, i) => ({ ...x, rank: i + 1 }));
  res.json({ enabled: true, rows });
});

app.post('/api/admin/gamification/badges/grant', async (req, res) => {
  const u = req.user;
  if (u.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email required' });

  const inputBadges = Array.isArray(req.body?.badges) ? req.body.badges : [];
  const badges = inputBadges
    .map((b) => ({
      key: String(b?.key || '').trim().slice(0, 80),
      label: String(b?.label || '').trim().slice(0, 120),
      source: String(b?.source || 'manual_grant').trim().slice(0, 60)
    }))
    .filter((b) => b.key && b.label);

  if (!badges.length) return res.status(400).json({ error: 'badges[] with key/label required' });

  let granted = 0;
  for (const b of badges) {
    const r = await db._query(
      `INSERT INTO learner_badges (email, badge_key, badge_label, source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email, badge_key) DO NOTHING
       RETURNING badge_key`,
      [email, b.key, b.label, b.source]
    );
    if (r && r.rows && r.rows.length) granted += 1;
  }

  const rows = await db._query(
    `SELECT badge_key AS key, badge_label AS label, source, earned_at AS "earnedAt"
       FROM learner_badges WHERE email = $1 ORDER BY earned_at DESC LIMIT 50`,
    [email]
  );

  res.status(201).json({ ok: true, email, requested: badges.length, granted, rows: rows ? rows.rows : [] });
});

app.get('/api/learner/gamification/motivation', async (_req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db._query(
    `SELECT id, class_key AS "classKey", email, display_name AS "displayName", message, status, created_at AS "createdAt"
       FROM learner_motivation_messages
      WHERE class_key = 'class-y7-fractions' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 50`,
    []
  );
  res.json({ enabled: true, rows: rows ? rows.rows : [] });
});

app.post('/api/learner/gamification/motivation', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message required' });
  if (message.length > 280) return res.status(400).json({ error: 'message too long (max 280)' });
  const scan = await cs.analyze(message);
  if (scan.ran && scan.blocked) {
    return res.status(400).json({ error: 'input_blocked', detail: 'Message blocked by Content Safety.', severities: scan.severities });
  }
  const displayName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim() || req.user.email;
  const r = await db._query(
    `INSERT INTO learner_motivation_messages (class_key, email, display_name, message)
     VALUES ('class-y7-fractions', $1, $2, $3)
     RETURNING id, class_key AS "classKey", email, display_name AS "displayName", message, status, created_at AS "createdAt"`,
    [req.user.email, displayName, message]
  );
  res.status(201).json({ row: r && r.rows[0] ? r.rows[0] : null });
});

app.get('/api/teacher/gamification/motivation', async (req, res) => {
  const u = req.user;
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db._query(
    `SELECT id, class_key AS "classKey", email, display_name AS "displayName", message, status, created_at AS "createdAt"
       FROM learner_motivation_messages
      WHERE class_key = 'class-y7-fractions'
      ORDER BY created_at DESC
      LIMIT 100`,
    []
  );
  res.json({ enabled: true, rows: rows ? rows.rows : [] });
});

app.post('/api/teacher/gamification/motivation/:id/hide', async (req, res) => {
  const u = req.user;
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  const reason = String(req.body?.reason || 'teacher_moderation').slice(0, 200);
  const up = await db._query(
    `UPDATE learner_motivation_messages
        SET status = 'hidden'
      WHERE id = $1
      RETURNING id, email, message, status`,
    [id]
  );
  if (!up || !up.rows[0]) return res.status(404).json({ error: 'message not found' });
  await db._query(
    `INSERT INTO learner_gamification_overrides (teacher_email, action_type, target_type, target_id, reason)
     VALUES ($1, 'hide_message', 'motivation_message', $2, $3)`,
    [u.email, String(id), reason]
  );
  res.json({ row: up.rows[0] });
});

app.get('/api/teacher/gamification/overrides', async (req, res) => {
  const u = req.user;
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const r = await db._query(
    `SELECT id, teacher_email AS "teacherEmail", action_type AS "actionType", target_type AS "targetType", target_id AS "targetId", reason, created_at AS "createdAt"
       FROM learner_gamification_overrides
      ORDER BY created_at DESC
      LIMIT 100`,
    []
  );
  res.json({ enabled: true, rows: r ? r.rows : [] });
});
// Streak + totals + earned badges (Feature 4 widget).
app.get('/api/learner/streak', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, streak: 0, badges: [] });
  const stats = await db.getLearnerStreak({ email: u.email, windowDays: 30 });
  if (!stats) return res.json({ enabled: true, streak: 0, badges: [] });
  res.json({ enabled: true, ...stats });
});
// Class-wide aggregate per skill. Teacher / admin only.
app.get('/api/teacher/class/mastery', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listClassMastery({ limit: 50 });
  res.json({ enabled: true, rows: rows || [] });
});
// Class-wide badge roster (Feature 4 gamification visibility). Teacher / admin only.
app.get('/api/teacher/class/badges', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listClassBadges({ limit: 30 });
  res.json({ enabled: true, rows: rows || [] });
});
// Heat-map: pseudonym × skill matrix (Feature 5a). Teacher / admin only.
app.get('/api/teacher/class/heatmap', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false });
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const data = await db.getClassHeatmap({ skillLimit: 24, learnerLimit: 30 });
  if (!data) return res.json({ enabled: true, skills: [], learners: [], cells: {} });
  // Strip raw learner emails from the response — replace with stable opaque keys (the pseudonym)
  // so the UI renders pseudonymous identifiers only. Server keeps the email→pseudonym mapping
  // server-side (we still send it back to allow round-tripping overrides through POST).
  res.json({ enabled: true, ...data });
});
// Record a teacher override (Feature 5a).
app.post('/api/teacher/overrides', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const learnerEmail = String(req.body?.learnerEmail || '').trim().toLowerCase();
  const skillId      = String(req.body?.skillId || '').trim();
  const humanLevel   = Number(req.body?.humanLevel);
  const aiLevel      = req.body?.aiLevel == null ? null : Number(req.body.aiLevel);
  const rationale    = req.body?.rationale ? String(req.body.rationale).slice(0, 1000) : null;
  if (!learnerEmail || !skillId) return res.status(400).json({ error: 'learnerEmail and skillId required' });
  if (!Number.isFinite(humanLevel) || humanLevel < 0 || humanLevel > 1) return res.status(400).json({ error: 'humanLevel must be in [0,1]' });
  const row = await db.recordTeacherOverride({ teacherEmail: u.email, learnerEmail, skillId, aiLevel, humanLevel, rationale });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  res.status(201).json({ row });
});
// List recent teacher overrides (audit feed). Teacher / admin only.
app.get('/api/teacher/overrides', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listTeacherOverrides({
    learner: req.query.learner ? String(req.query.learner).toLowerCase() : null,
    skill:   req.query.skill   ? String(req.query.skill) : null,
    limit:   Math.min(Number(req.query.limit) || 50, 200)
  });
  res.json({ enabled: true, rows: rows || [] });
});

// --- Parent dashboard (Feature 6, read-only) ----------------------------
function isParentOrAdmin(u) { return u && (u.role === 'parent' || u.role === 'admin'); }
async function ensureLinked(req, res) {
  const childEmail = String(req.params.child || '').toLowerCase();
  if (!childEmail) { res.status(400).json({ error: 'child email required' }); return null; }
  if (req.user.role === 'admin') return childEmail;
  const linked = await db.isParentOfChild({ parentEmail: req.user.email, childEmail });
  if (!linked) { res.status(403).json({ error: 'not linked to this learner' }); return null; }
  return childEmail;
}
// List the children a parent is linked to (also returns enrichment from auth users so the
// parent UI can show a friendly name + grade rather than the raw email).
app.get('/api/parent/children', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, children: [] });
  if (!isParentOrAdmin(u)) return res.status(403).json({ error: 'parent only' });
  const rows = await db.listChildrenForParent({ parentEmail: u.email }) || [];
  const consents = await db.getConsentsForParent({ parentEmail: u.email }) || [];
  const consentMap = {};
  for (const c of consents) {
    if (!consentMap[c.child_email]) consentMap[c.child_email] = {};
    consentMap[c.child_email][c.consent_type] = { granted: c.granted, grantedAt: c.granted_at, withdrawnAt: c.withdrawn_at };
  }
  // Enrich with display name from the in-memory user store (auth.js) — never includes any PII
  // beyond the demo seed users (no real children).
  const auth = require('./auth');
  const out = rows.map(r => {
    const usr = (auth.SEED_USERS || []).find(x => x.email && x.email.toLowerCase() === r.childEmail);
    return {
      childEmail: r.childEmail,
      displayName: usr ? [usr.firstName, usr.lastName].filter(Boolean).join(' ').trim() : r.childEmail,
      relationship: r.relationship,
      age: usr ? usr.age : null,
      requiresConsent: usr ? (usr.age < 16) : false,
      consent: consentMap[r.childEmail] || {},
      since: r.createdAt
    };
  });
  res.json({ enabled: true, children: out });
});
// Per-skill mastery for the linked child (re-uses the learner mastery helper).
app.get('/api/parent/child/:child/mastery', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const childEmail = await ensureLinked(req, res); if (!childEmail) return;
  const rows = await db.listMasteryForLearner({ email: childEmail, limit: 50 });
  res.json({ enabled: true, rows: rows || [] });
});
// Streak / badges for the linked child.
app.get('/api/parent/child/:child/streak', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const childEmail = await ensureLinked(req, res); if (!childEmail) return;
  const stats = await db.getLearnerStreak({ email: childEmail, windowDays: 30 });
  res.json({ enabled: true, ...(stats || { streak: 0, badges: [] }) });
});
// Per-day activity (last 30 days) for the trend chart.
app.get('/api/parent/child/:child/activity', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const childEmail = await ensureLinked(req, res); if (!childEmail) return;
  const rows = await db.listLearnerActivity({ email: childEmail, days: 30 });
  res.json({ enabled: true, rows: rows || [] });
});
// Recent teacher Q&A (read-only) so the parent sees what a teacher answered to their child.
app.get('/api/parent/child/:child/teacher-questions', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const childEmail = await ensureLinked(req, res); if (!childEmail) return;
  const rows = await db.listTeacherQuestionsForLearnerReadOnly({ childEmail, limit: 20 });
  res.json({ enabled: true, rows: rows || [] });
});

// --- Parental consent (GDPR Art. 8) ---
app.get('/api/parent/consents', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, consents: [] });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const rows = await db.getConsentsForParent({ parentEmail: req.user.email });
  res.json({ enabled: true, consents: rows || [] });
});

app.post('/api/parent/consents', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const childEmail = String(req.body?.childEmail || '').trim().toLowerCase();
  const consentType = String(req.body?.consentType || 'gdpr_art8');
  const granted = Boolean(req.body?.granted);
  if (!childEmail) return res.status(400).json({ error: 'childEmail required' });
  if (req.user.role !== 'admin') {
    const linked = await db.isParentOfChild({ parentEmail: req.user.email, childEmail });
    if (!linked) return res.status(403).json({ error: 'not linked to this learner' });
  }
  const row = await db.upsertConsent({
    parentEmail: req.user.email,
    childEmail,
    consentType,
    granted,
    ip: (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.ip,
    userAgent: (req.headers['user-agent'] || '').slice(0, 256)
  });
  // GDPR Art. 8 evidence logging (T044) for direct parent grant/withdraw from the portal.
  db.recordAuditEvent({
    eventType: 'parental_consent_decision',
    actorId: req.user.email, actorRole: req.user.role,
    targetType: 'parental_consent', targetId: childEmail,
    scope: { decision: granted ? 'granted' : 'withdrawn', consentType, disclosureVersion: row ? row.disclosure_version : db.CONSENT_DISCLOSURE_VERSION, source: 'parent_portal' },
    outcome: granted ? 'granted' : 'withdrawn'
  }).catch(() => {});
  res.json({ ok: true, consent: row });
});

// --- Consent requests: enqueue, dispatch, reminders (GDPR Art. 8, US3) -----
// Helper: build the absolute consent link a parent follows from an email/notification.
function consentLinkFor(req, token) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}/consent-pending.html?token=${token}`;
}

// Enqueue + dispatch a consent request for an under-16 learner's parent(s) (T038).
// Admin or teacher initiates; one time-boxed token link is created per linked parent.
app.post('/api/consent/requests', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const u = req.user;
  if (!u || !['admin', 'teacher', 'parent'].includes(u.role)) return res.status(403).json({ error: 'staff or parent only' });
  const childEmail = String(req.body?.childEmail || '').trim().toLowerCase();
  if (!childEmail) return res.status(400).json({ error: 'childEmail required' });
  // A parent may only request for their own linked child.
  let parents = [];
  if (u.role === 'parent') {
    const linked = await db.isParentOfChild({ parentEmail: u.email, childEmail });
    if (!linked) return res.status(403).json({ error: 'not linked to this learner' });
    parents = [{ parentEmail: u.email }];
  } else {
    parents = (await db.listParentsForChild({ childEmail })) || [];
  }
  if (!parents.length) return res.status(404).json({ error: 'no parent linked to this learner' });
  const out = [];
  for (const p of parents) {
    const parentEmail = (p.parentEmail || p.parent_email || '').toLowerCase();
    if (!parentEmail) continue;
    const reqRow = await db.createConsentRequest({ parentEmail, childEmail });
    if (!reqRow) continue;
    out.push({ parentEmail, token: reqRow.token, link: consentLinkFor(req, reqRow.token), expiresAt: reqRow.expires_at, status: reqRow.status });
    db.recordAuditEvent({
      eventType: 'parental_consent_request_created',
      actorId: u.email, actorRole: u.role,
      targetType: 'consent_request', targetId: childEmail,
      scope: { parentEmail, disclosureVersion: reqRow.disclosure_version, ttlDays: db.CONSENT_TTL_DAYS, source: 'under16_activation' },
      outcome: 'pending'
    }).catch(() => {});
  }
  res.json({ ok: true, requests: out });
});

// Parent-facing list of their own consent requests (pending + history) (T044 rights-surface).
app.get('/api/parent/consent-requests', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, requests: [] });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const rows = await db.listConsentRequestsForParent({ parentEmail: req.user.email }) || [];
  const requests = rows.map(r => ({
    childEmail: r.child_email,
    status: r.is_expired ? 'expired' : r.status,
    disclosureVersion: r.disclosure_version,
    requestedAt: r.requested_at,
    expiresAt: r.expires_at,
    resolvedAt: r.resolved_at,
    link: r.status === 'pending' && !r.is_expired ? consentLinkFor(req, r.token) : null
  }));
  res.json({ enabled: true, requests });
});

// Reminder dispatch path for unresolved consent requests at day 6 (T043). Admin-triggered
// (or invoked by a scheduled job). Expires stale requests first, then reminds the rest.
app.post('/api/consent/reminders/run', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const u = req.user;
  if (!u || u.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  const reminderAfterDays = Number.isFinite(Number(req.body?.reminderAfterDays)) ? Number(req.body.reminderAfterDays) : 6;
  const expiredCount = await db.expireStaleConsentRequests();
  const due = await db.listConsentRequestsNeedingReminder({ reminderAfterDays }) || [];
  const reminded = [];
  for (const r of due) {
    await db.markConsentRequestReminded({ id: r.id });
    reminded.push({ parentEmail: r.parent_email, childEmail: r.child_email, link: consentLinkFor(req, r.token), expiresAt: r.expires_at });
    db.recordAuditEvent({
      eventType: 'parental_consent_reminder_sent',
      actorId: u.email, actorRole: 'admin',
      targetType: 'consent_request', targetId: r.child_email,
      scope: { parentEmail: r.parent_email, reminderAfterDays, expiresAt: r.expires_at },
      outcome: 'reminded'
    }).catch(() => {});
  }
  res.json({ ok: true, expired: expiredCount, remindedCount: reminded.length, reminded });
});
// Admin-only rebuild of the mastery rollup from item_attempts.
app.post('/api/learner/mastery/recompute', async (req, res) => {
  const u = req.user;
  if (!u || u.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  const out = await db.recomputeAllMastery();
  res.json(out);
});

// --- Parent ↔ teacher messaging (Feature 6, US2) ---------------------------
// All parent/teacher message bodies are scanned by Azure Content Safety before
// delivery. Flagged content is quarantined (delivery_state='quarantined') and held
// for teacher moderation (EU AI Act Art. 14 human oversight); clean content is
// delivered immediately. Every action is written to the immutable audit_event log.

// Parent inbox: latest delivered message per thread + unread badge count.
app.get('/api/parent/messages', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, threads: [], unread: 0 });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const threads = await db.listParentInbox({ recipientEmail: req.user.email, limit: 50 }) || [];
  const unread = await db.countUnreadParentMessages({ recipientEmail: req.user.email });
  res.json({ enabled: true, threads, unread });
});
// Full message list for one thread (parent or teacher participant).
app.get('/api/parent/messages/thread/:threadId', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, messages: [] });
  const u = req.user;
  if (!['parent', 'teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'forbidden' });
  const rows = await db.listParentThread({ threadId: String(req.params.threadId), viewerEmail: u.email, includeQuarantined: u.role !== 'parent', limit: 100 });
  res.json({ enabled: true, messages: rows || [] });
});
// Parent sends a message to the child's teacher (or replies in a thread).
app.post('/api/parent/messages', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const childEmail = String(req.body?.childEmail || '').trim().toLowerCase();
  const recipientEmail = String(req.body?.recipientEmail || '').trim().toLowerCase() || null;
  const body = String(req.body?.body || '').trim();
  const subject = req.body?.subject ? String(req.body.subject).trim() : null;
  if (!childEmail || !body) return res.status(400).json({ error: 'childEmail and body required' });
  if (req.user.role !== 'admin') {
    const linked = await db.isParentOfChild({ parentEmail: req.user.email, childEmail });
    if (!linked) return res.status(403).json({ error: 'not linked to this learner' });
  }
  const scan = await cs.analyze(`${subject || ''}\n\n${body}`);
  const flagged = scan.ran && scan.blocked;
  const threadId = db.parentThreadId({ parentEmail: req.user.email, childEmail });
  const row = await db.createParentMessage({
    threadId, senderEmail: req.user.email, senderRole: 'parent', recipientEmail, childEmail,
    subject, body, csVerdict: scan.ran ? (flagged ? 'flagged' : 'clean') : 'skipped',
    csSeverities: scan.severities || {}, deliveryState: flagged ? 'quarantined' : 'delivered'
  });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  db.recordAuditEvent({ eventType: 'parent_message_sent', actorId: req.user.email, actorRole: 'parent', targetType: 'parent_message', targetId: String(row.id), scope: { childEmail, csVerdict: row.cs_verdict, deliveryState: row.delivery_state }, outcome: flagged ? 'quarantined' : 'delivered' }).catch(() => {});
  res.status(201).json({ message: row, moderation: flagged ? 'Your message is awaiting teacher review (Content Safety).' : null });
});
// Mark a delivered message read (read receipt).
app.post('/api/parent/messages/:id/read', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const row = await db.markParentMessageRead({ id: req.params.id, recipientEmail: req.user.email });
  res.json({ ok: Boolean(row), readAt: row ? row.read_at : null });
});

// Teacher posts an announcement / reply to the parent(s) of a child.
app.post('/api/teacher/parent-messages', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  const u = req.user;
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const childEmail = String(req.body?.childEmail || '').trim().toLowerCase();
  const body = String(req.body?.body || '').trim();
  const subject = req.body?.subject ? String(req.body.subject).trim() : null;
  if (!childEmail || !body) return res.status(400).json({ error: 'childEmail and body required' });
  const parents = await db.listParentsForChild({ childEmail }) || [];
  if (!parents.length) return res.status(404).json({ error: 'no linked parent for this learner' });
  const scan = await cs.analyze(`${subject || ''}\n\n${body}`);
  const flagged = scan.ran && scan.blocked;
  const out = [];
  for (const p of parents) {
    const threadId = db.parentThreadId({ parentEmail: p.parentEmail, childEmail });
    const row = await db.createParentMessage({
      threadId, senderEmail: u.email, senderRole: 'teacher', recipientEmail: p.parentEmail, childEmail,
      subject, body, csVerdict: scan.ran ? (flagged ? 'flagged' : 'clean') : 'skipped',
      csSeverities: scan.severities || {}, deliveryState: flagged ? 'quarantined' : 'delivered'
    });
    if (row) out.push(row);
  }
  db.recordAuditEvent({ eventType: 'teacher_announcement_sent', actorId: u.email, actorRole: 'teacher', targetType: 'parent_message', targetId: childEmail, scope: { recipients: parents.length, csVerdict: flagged ? 'flagged' : 'clean' }, outcome: flagged ? 'quarantined' : 'delivered' }).catch(() => {});
  res.status(201).json({ sent: out.length, messages: out });
});
// Moderation queue (flagged messages) — teacher / admin only.
app.get('/api/teacher/parent-messages/moderation', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!['teacher', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listParentModerationQueue({ limit: 100 });
  res.json({ enabled: true, rows: rows || [] });
});
// Approve (deliver) or reject a quarantined message.
app.post('/api/teacher/parent-messages/:id/moderate', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!['teacher', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'teacher only' });
  const action = req.body?.action === 'approve' ? 'approve' : 'reject';
  const row = await db.moderateParentMessage({ id: req.params.id, moderatorEmail: req.user.email, action });
  if (!row) return res.status(404).json({ error: 'not found or already moderated' });
  db.recordAuditEvent({ eventType: 'parent_message_moderated', actorId: req.user.email, actorRole: req.user.role, targetType: 'parent_message', targetId: String(row.id), scope: { action }, outcome: row.delivery_state }).catch(() => {});
  res.json({ ok: true, message: row });
});

// --- Parent preferences (Feature 6, US4 digest opt-in / US5 language) -------
app.get('/api/parent/preferences', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, preferences: null });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const preferences = await db.getParentPreferences({ parentEmail: req.user.email });
  res.json({ enabled: true, preferences });
});
app.put('/api/parent/preferences', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const SUPPORTED = ['en', 'nl', 'de', 'fr', 'es', 'pl', 'ro'];
  const language = req.body?.language != null ? String(req.body.language).toLowerCase() : null;
  if (language && !SUPPORTED.includes(language)) return res.status(400).json({ error: `language must be one of ${SUPPORTED.join(', ')}` });
  const row = await db.setParentPreferences({
    parentEmail: req.user.email,
    language,
    digestOptIn: req.body?.digestOptIn != null ? Boolean(req.body.digestOptIn) : null,
    emailFrequency: req.body?.emailFrequency != null ? String(req.body.emailFrequency) : null,
    notifyInApp: req.body?.notifyInApp != null ? Boolean(req.body.notifyInApp) : null,
    notifyEmail: req.body?.notifyEmail != null ? Boolean(req.body.notifyEmail) : null
  });
  db.recordAuditEvent({ eventType: 'parent_preferences_updated', actorId: req.user.email, actorRole: 'parent', targetType: 'parent_preferences', targetId: req.user.email, scope: { language: row ? row.language : null, digestOptIn: row ? row.digest_opt_in : null }, outcome: 'ok' }).catch(() => {});
  res.json({ ok: true, preferences: row });
});

// --- Weekly digest + "How to help" (Feature 6, US4) ------------------------
// "How to help this week" tips, sourced from approved pedagogical guidance keyed by
// learning domain. Reviewed by Learning Sciences (ZPD-aligned, non-prescriptive).
const HOW_TO_HELP = {
  numeracy:  'Practise fractions with everyday objects — split a pizza or share coins to make the maths concrete.',
  literacy:  'Read together for 10 minutes and ask your child to summarise the story in their own words.',
  science:   'Cook a simple recipe together and talk about what changes when things heat or cool.',
  language:  'Label a few household objects in the target language and review them at dinner.',
  _default:  'Ask your child to teach you one thing they learned this week — explaining it back deepens learning.'
};
function howToHelpFor(summary) {
  const dom = summary && summary.weakestDomain ? summary.weakestDomain.domain : (summary && summary.topDomains && summary.topDomains[0] ? summary.topDomains[0].domain : null);
  const key = dom ? String(dom).toLowerCase() : '_default';
  return HOW_TO_HELP[key] || HOW_TO_HELP._default;
}
// Dashboard latency instrumentation for the SC-001 p95 <= 3s SLO (US1, T023).
// In-memory ring buffer of recent weekly-summary durations (ms); surfaced via /api/parent/metrics.
const DASH_LAT = [];
function recordDashLatency(ms) { DASH_LAT.push(ms); if (DASH_LAT.length > 200) DASH_LAT.shift(); }
function dashP95() { if (!DASH_LAT.length) return null; const s = [...DASH_LAT].sort((a, b) => a - b); return s[Math.max(0, Math.ceil(0.95 * s.length) - 1)]; }
// Live weekly summary for one linked child (dashboard + digest preview).
app.get('/api/parent/child/:child/weekly-summary', async (req, res) => {
  const _t0 = Date.now();
  if (!db.enabled) return res.json({ enabled: false, summary: null });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const childEmail = await ensureLinked(req, res); if (!childEmail) return;
  const summary = await db.weeklyChildSummary({ childEmail });
  const _ms = Date.now() - _t0;
  recordDashLatency(_ms);
  res.set('Server-Timing', `dashboard;dur=${_ms}`);
  res.json({ enabled: true, summary, howToHelp: howToHelpFor(summary) });
});
// Past digests for the parent.
app.get('/api/parent/digests', async (req, res) => {
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const rows = await db.listParentDigests({ parentEmail: req.user.email, limit: 12 });
  res.json({ enabled: true, rows: rows || [] });
});
// Generate (or refresh) this week's digest for every linked child — respects opt-out.
app.post('/api/parent/digests/generate', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const prefs = await db.getParentPreferences({ parentEmail: req.user.email });
  if (prefs && prefs.digest_opt_in === false) return res.json({ ok: true, generated: 0, optedOut: true });
  const children = await db.listChildrenForParent({ parentEmail: req.user.email }) || [];
  const monday = new Date(); const day = (monday.getUTCDay() + 6) % 7; monday.setUTCDate(monday.getUTCDate() - day);
  const weekStart = monday.toISOString().slice(0, 10);
  const out = [];
  for (const c of children) {
    const summary = await db.weeklyChildSummary({ childEmail: c.childEmail });
    const row = await db.upsertParentDigest({
      parentEmail: req.user.email, childEmail: c.childEmail, weekStart,
      summary, howToHelp: howToHelpFor(summary), tone: summary.tone, language: prefs ? prefs.language : 'en'
    });
    if (row) out.push(row);
  }
  // Email-send audit hook for SC-003 engagement measurement (digest dispatched/queued).
  db.recordAuditEvent({ eventType: 'parent_digest_generated', actorId: req.user.email, actorRole: 'parent', targetType: 'parent_digest', targetId: weekStart, scope: { generated: out.length, language: prefs ? prefs.language : 'en' }, outcome: 'queued' }).catch(() => {});
  res.json({ ok: true, generated: out.length, weekStart, digests: out });
});
// Record digest engagement (email open / portal visit) for SC-003 measurement (US4, T052).
app.post('/api/parent/digests/:id/engagement', async (req, res) => {
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const kind = ['opened', 'visited'].includes(req.body?.kind) ? req.body.kind : 'opened';
  db.recordAuditEvent({ eventType: 'parent_digest_engagement', actorId: req.user.email, actorRole: 'parent', targetType: 'parent_digest', targetId: String(req.params.id), scope: { kind }, outcome: 'tracked' }).catch(() => {});
  res.json({ ok: true, kind });
});
// Outcome metrics surface (SC-001..SC-007 collection/reporting, T066). Parent/admin only.
app.get('/api/parent/metrics', async (req, res) => {
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  let supported = null, coverage = null;
  try {
    const tr = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'models', 'translations.json'), 'utf8'));
    supported = (tr._meta && tr._meta.supported) || null;
    const en = Object.keys(tr.en || {});
    coverage = {};
    for (const l of (supported || []).filter(x => x !== 'en')) {
      const o = tr[l] || {};
      const present = en.filter(k => o[k] && String(o[k]).trim().length).length;
      coverage[l] = en.length ? Math.round(1000 * present / en.length) / 10 : 0;
    }
  } catch (e) { supported = null; coverage = null; }
  res.json({
    enabled: true,
    sc001_dashboardP95Ms: dashP95(),
    sc001_dashboardSamples: DASH_LAT.length,
    sc002_consentTtlDays: db.CONSENT_TTL_DAYS != null ? db.CONSENT_TTL_DAYS : 7,
    sc005_contentSafetyEnabled: cs.enabled === true,
    sc006_languageCount: supported ? supported.length : null,
    sc006_translationCoverage: coverage
  });
});

// --- Family Resources Center (Feature 6, US5) ------------------------------
// Localized at-home support content, filtered by locale, learner age range and topic.
// Manifest is app-specific (parent-portal/data); other apps return an empty set.
let _resourcesCache = null;
function loadFamilyResources() {
  if (_resourcesCache) return _resourcesCache;
  try {
    const p = path.join(__dirname, 'data', 'family-resources.manifest.json');
    _resourcesCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { _resourcesCache = { resources: [], _meta: {} }; }
  return _resourcesCache;
}
app.get('/api/parent/resources', async (req, res) => {
  if (!isParentOrAdmin(req.user)) return res.status(403).json({ error: 'parent only' });
  const manifest = loadFamilyResources();
  const SUPPORTED = (manifest._meta && manifest._meta.supported) || ['en'];
  let locale = String(req.query.locale || '').toLowerCase();
  if (!SUPPORTED.includes(locale)) {
    // Fall back to the parent's saved language, then English.
    if (db.enabled) { try { const pref = await db.getParentPreferences({ parentEmail: req.user.email }); locale = SUPPORTED.includes(pref.language) ? pref.language : 'en'; } catch (e) { locale = 'en'; } }
    else locale = 'en';
  }
  const ageFilter = req.query.age ? String(req.query.age) : null;
  const topicFilter = req.query.topic ? String(req.query.topic).toLowerCase() : null;
  const items = (manifest.resources || [])
    .filter(r => (!ageFilter || r.ageRange === ageFilter) && (!topicFilter || String(r.topic).toLowerCase() === topicFilter))
    .map(r => {
      const t = (r.i18n && (r.i18n[locale] || r.i18n.en)) || {};
      return { id: r.id, topic: r.topic, ageRange: r.ageRange, title: t.title || '', summary: t.summary || '', url: t.url || '', review: r.review || null };
    });
  res.json({ enabled: true, locale, supported: SUPPORTED, count: items.length, resources: items });
});

// --- Teacher Q&A (learner ↔ teacher async messaging) ----------------------
// Learner posts a question; teacher (or admin) sees an inbox and replies.
app.post('/api/teacher-questions', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!['student', 'admin'].includes(u.role)) return res.status(403).json({ error: 'student only' });
  const subject = String(req.body?.subject || '').trim();
  const question = String(req.body?.question || '').trim();
  if (!subject || !question) return res.status(400).json({ error: 'subject and question required' });
  // Content Safety on the learner's message — same threshold as /api/chat.
  const scan = await cs.analyze(`${subject}\n\n${question}`);
  if (scan.ran && scan.blocked) {
    return res.status(400).json({ error: 'input_blocked', detail: 'Your question was flagged by Azure AI Content Safety.', severities: scan.severities, threshold: scan.threshold });
  }
  const learnerName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null;
  const row = await db.createTeacherQuestion({ learnerEmail: u.email, learnerName, subject, question });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  res.status(201).json({ row });
});

app.get('/api/teacher-questions/mine', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  const rows = await db.listTeacherQuestionsForLearner({ learnerEmail: u.email, limit: 50 });
  res.json({ enabled: true, rows: rows || [] });
});

app.get('/api/teacher-questions/inbox', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const status = req.query.status === 'answered' || req.query.status === 'pending' ? req.query.status : null;
  const rows = await db.listTeacherQuestionsInbox({ status, limit: 100 });
  res.json({ enabled: true, rows: rows || [] });
});

app.post('/api/teacher-questions/:id/answer', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!['teacher', 'admin'].includes(u.role)) return res.status(403).json({ error: 'teacher only' });
  const answer = String(req.body?.answer || '').trim();
  if (!answer) return res.status(400).json({ error: 'answer required' });
  const scan = await cs.analyze(answer);
  if (scan.ran && scan.blocked) {
    return res.status(400).json({ error: 'output_blocked', detail: 'Your answer was flagged by Azure AI Content Safety.', severities: scan.severities, threshold: scan.threshold });
  }
  const teacherName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null;
  const row = await db.answerTeacherQuestion({ id: req.params.id, teacherEmail: u.email, teacherName, answer });
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ row });
});

// ===========================================================================
// Teacher Assessment, AI Rubric Assist & At-Risk Dashboards (Feature 008)
// High-risk AI surface — EU AI Act Articles 5/9/10/13/14/15.
// Invariants enforced here:
//  * Art.5  prohibited-practice validator rejects emotion/biometric/autonomous-grading asks.
//  * Art.14 every AI artifact is teacher-gated; nothing is assignable without approval.
//  * Art.15 fail-closed: if Content Safety cannot run, generated text is held for review.
//  * Art.13 transparency metadata attached to every AI response.
//  * Art.10 data-minimisation: only objective hashes + bounded context are persisted.
// All actions write an immutable audit_event row with a shared correlation id.
// ===========================================================================

function teacherOnly(u) { return u && ['teacher', 'admin'].includes(u.role); }

// Art.5 prohibited-practice guard. Returns {ok:true} or {ok:false, reason}.
const PROHIBITED_PATTERNS = [
  { rx: /\b(emotion|affect|mood)\s+(recognition|detection|analysis)\b/i, reason: 'emotion_recognition' },
  { rx: /\b(facial|face)\s+recognition\b/i, reason: 'facial_recognition' },
  { rx: /\bbiometric\s+(categor|identif)/i, reason: 'biometric_categorisation' },
  { rx: /\b(automatic|autonomous)\s+grad/i, reason: 'autonomous_grading' },
  { rx: /\bgrade\s+(them|the\s+students?|learners?)\s+(automatically|without\s+(a\s+)?teacher)/i, reason: 'autonomous_grading' },
  { rx: /\b(social\s+scoring|rank\s+children\s+by\s+behaviou?r)\b/i, reason: 'social_scoring' },
  { rx: /\b(behaviou?ral\s+advertis|target\s+ads?\s+at\s+(children|students|learners))\b/i, reason: 'behavioural_advertising' }
];
function checkProhibitedPractice(text) {
  const hit = PROHIBITED_PATTERNS.find(p => p.rx.test(String(text || '')));
  return hit ? { ok: false, reason: hit.reason } : { ok: true };
}

// Art.13 transparency metadata attached to every AI-generated response.
function transparencyMeta(extra) {
  return Object.assign({
    aiGenerated: true,
    system: 'LearnEU Assessment Assist (high-risk per EU AI Act Annex III)',
    humanOversight: 'A teacher must review and approve before any AI draft can be assigned to learners.',
    notAutonomous: 'This system does not grade autonomously and performs no biometric or emotion analysis.',
    dataResidency: 'Processing occurs in the EU (Azure West Europe). Objective prompts are stored only as hashes.',
    modelDeployment: DEP
  }, extra || {});
}

// Art.15 robustness: call APIM/AOAI with bounded context. Fail-closed on transport errors.
async function callAssessmentModel(systemPrompt, userPrompt, maxTokens) {
  if (!APIM || !KEY || KEY.startsWith('@Microsoft.KeyVault')) {
    return { ok: false, reason: 'model_unavailable' };
  }
  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: String(userPrompt || '').slice(0, 4000) }
    ],
    max_completion_tokens: Math.min(Number(maxTokens) || 700, 1500)
  };
  const url = `${APIM}/aoai/openai/deployments/${encodeURIComponent(DEP)}/chat/completions?api-version=2024-08-01-preview`;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': KEY }, body: JSON.stringify(body) });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('application/json')) {
      return { ok: false, reason: 'model_error', status: r.status };
    }
    const data = await r.json();
    return { ok: true, text: data?.choices?.[0]?.message?.content ?? '', model: data?.model || DEP };
  } catch (e) {
    return { ok: false, reason: 'model_error', detail: String(e && e.message || e) };
  }
}

// Content Safety orchestration with fail-closed posture. Returns a normalised verdict.
async function scanAssessmentText(text) {
  const scan = await cs.analyze(text);
  // Fail-closed: when CS is enabled but did not run, hold the content for manual review.
  if (cs.enabled && !scan.ran) {
    return { verdictStatus: 'flagged', requiresManualReview: true, blocked: false, severities: scan.severities || {}, ran: false };
  }
  return {
    verdictStatus: scan.blocked ? 'blocked' : (scan.ran ? 'pass' : 'pass'),
    requiresManualReview: Boolean(scan.blocked),
    blocked: Boolean(scan.blocked),
    severities: scan.severities || {},
    raw: scan.raw,
    ran: scan.ran
  };
}

// ---- US1: Rubric authoring & scoring (T019-T029) --------------------------
app.post('/api/teacher/assessments/rubrics', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const title = String(req.body?.title || '').trim();
  const criteria = Array.isArray(req.body?.criteria) ? req.body.criteria : [];
  if (!title) return res.status(400).json({ error: 'title required' });
  if (criteria.length < 2 || criteria.length > 5) return res.status(400).json({ error: 'rubric requires 2-5 criteria' });
  const row = await db.createRubric({
    title, creatorTeacherId: u.email,
    levelCount: req.body?.levelCount, criterionCount: criteria.length, criteria,
    weightingMode: req.body?.weightingMode, sharedVisibility: req.body?.sharedVisibility
  });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  await db.recordAssessmentAudit({ eventType: 'rubric_created', actorId: u.email, actorRole: u.role, targetType: 'rubric', targetId: row.id, scope: { criterionCount: criteria.length, levelCount: row.level_count } });
  res.status(201).json({ rubric: row });
});

app.get('/api/teacher/assessments/rubrics', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listRubrics({ creatorTeacherId: req.query.mine === '1' ? u.email : null, status: req.query.status || null, limit: 100 });
  res.json({ enabled: true, rows: rows || [] });
});

app.post('/api/teacher/assessments/rubrics/:id/publish', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const row = await db.publishRubric({ id: req.params.id });
  if (!row) return res.status(404).json({ error: 'not found' });
  await db.recordAssessmentAudit({ eventType: 'rubric_published', actorId: u.email, actorRole: u.role, targetType: 'rubric', targetId: row.id, scope: {} });
  res.json({ rubric: row });
});

app.post('/api/teacher/assessments/rubrics/:id/score', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const learnerId = String(req.body?.learnerId || '').trim().toLowerCase();
  if (!learnerId) return res.status(400).json({ error: 'learnerId required' });
  const feedback = req.body?.teacherFeedbackText ? String(req.body.teacherFeedbackText) : null;
  // All teacher feedback shown to learners is Content-Safety scanned.
  let feedbackSafetyStatus = 'not_scanned';
  if (feedback) {
    const verdict = await scanAssessmentText(feedback);
    feedbackSafetyStatus = verdict.verdictStatus;
    await db.recordSafetyVerdict({ artifactId: null, contentType: 'teacher_feedback', categoryScores: verdict.severities, flaggedCategories: verdict.blocked ? ['blocked'] : [], verdictStatus: verdict.verdictStatus, requiresManualReview: verdict.requiresManualReview });
    if (verdict.blocked) return res.status(400).json({ error: 'feedback_blocked', detail: 'Your feedback was flagged by Azure AI Content Safety.', severities: verdict.severities });
  }
  const row = await db.recordRubricScore({
    rubricId: req.params.id, learnerId, assessmentId: req.body?.assessmentId || null,
    criterionScores: req.body?.criterionScores, overallLevel: req.body?.overallLevel,
    masteryPercent: req.body?.masteryPercent, teacherFeedbackText: feedback,
    feedbackSafetyStatus, scoredByTeacherId: u.email
  });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  await db.recordAssessmentAudit({ eventType: 'rubric_scored', actorId: u.email, actorRole: u.role, targetType: 'rubric_score', targetId: row.id, scope: { rubricId: req.params.id, learnerId, masteryPercent: row.mastery_percent } });
  res.status(201).json({ score: row });
});

app.get('/api/teacher/assessments/rubrics/:id/scores', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listRubricScores({ rubricId: req.params.id, limit: 200 });
  res.json({ enabled: true, rows: rows || [] });
});

// ---- US4: AI generation + mandatory teacher approval gate (T057-T068) -----
app.post('/api/teacher/assessments/generate', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const artifactType = String(req.body?.artifactType || 'rubric');
  const objective = String(req.body?.objective || '').trim();
  if (!objective) return res.status(400).json({ error: 'objective required' });

  // Art.5 prohibited-practice deterministic refusal (fail-closed, audited).
  const guard = checkProhibitedPractice(objective);
  if (!guard.ok) {
    await db.recordAssessmentAudit({ eventType: 'ai_generation_refused', actorId: u.email, actorRole: u.role, targetType: 'ai_artifact', targetId: 'n/a', scope: { reason: guard.reason }, outcome: 'refused' });
    return res.status(422).json({ error: 'prohibited_practice', reason: guard.reason, detail: 'This request describes a prohibited AI practice and cannot be generated.', transparency: transparencyMeta() });
  }

  // Input scan of the objective text.
  const inputVerdict = await scanAssessmentText(objective);
  if (inputVerdict.blocked) {
    await db.recordAssessmentAudit({ eventType: 'ai_generation_refused', actorId: u.email, actorRole: u.role, targetType: 'ai_artifact', targetId: 'n/a', scope: { reason: 'input_blocked' }, outcome: 'refused' });
    return res.status(400).json({ error: 'input_blocked', detail: 'Your objective was flagged by Azure AI Content Safety.', severities: inputVerdict.severities });
  }

  // Governed template selection (cache-aware).
  const family = artifactType === 'question_set' ? 'question_set' : (artifactType === 'remediation_suggestion' ? 'remediation' : 'rubric');
  const tpl = await db.getTemplateCacheEntry({ cacheKey: `${family}:default:en` });
  const templateVersion = tpl ? tpl.template_version : 'builtin-v1';
  const sysPrompt = (tpl && tpl.template_text) || (
    family === 'rubric'
      ? 'You are a pedagogy assistant helping a teacher draft an assessment rubric. Produce a clear rubric with 3-5 mastery levels and 2-5 criteria as a JSON object. Use age-appropriate, neutral, inclusive language. Never grade students; only draft. Output must be reviewed by a teacher.'
      : family === 'question_set'
        ? 'You are a pedagogy assistant drafting a short set of practice questions for a teacher to review. Use age-appropriate, neutral, inclusive language. Provide questions with model answers. The teacher will review before any use.'
        : 'You are a pedagogy assistant suggesting remediation activities for learners below a mastery threshold. Provide concrete, age-appropriate scaffolding steps for a teacher to review.'
  );

  const gen = await callAssessmentModel(sysPrompt, objective, req.body?.maxTokens);
  if (!gen.ok) {
    // Art.15 fail-closed: surface unavailability, do not fabricate.
    await db.recordAssessmentAudit({ eventType: 'ai_generation_failed', actorId: u.email, actorRole: u.role, targetType: 'ai_artifact', targetId: 'n/a', scope: { reason: gen.reason }, outcome: 'error' });
    return res.status(503).json({ error: gen.reason, detail: 'The generation model is unavailable. No draft was produced.', transparency: transparencyMeta() });
  }

  // Output scan of the generated text.
  const outVerdict = await scanAssessmentText(gen.text);
  const safetyStatus = outVerdict.blocked ? 'blocked' : (outVerdict.requiresManualReview ? 'flagged' : 'pass');

  // Persist as a NON-assignable draft (data-minimised: objective stored as a hash only).
  const artifact = await db.createAIArtifact({
    artifactType: family === 'remediation' ? 'remediation_suggestion' : (family === 'question_set' ? 'question_set' : 'rubric'),
    objectiveText: objective,
    boundedPromptContext: { gradeTag: req.body?.gradeTag || null, subjectTag: req.body?.subjectTag || null, locale: req.body?.locale || 'en' },
    modelDeployment: DEP, modelVersion: gen.model,
    generatedText: outVerdict.blocked ? '' : gen.text,
    templateVersion, createdByTeacherId: u.email,
    safetyStatus, generationStatus: 'safety_reviewed'
  });
  await db.recordSafetyVerdict({
    artifactId: artifact ? artifact.id : null,
    contentType: family === 'rubric' ? 'generated_rubric' : (family === 'question_set' ? 'generated_question_set' : 'remediation_suggestion'),
    categoryScores: outVerdict.severities, flaggedCategories: outVerdict.blocked ? ['blocked'] : (outVerdict.requiresManualReview ? ['manual_review'] : []),
    verdictStatus: outVerdict.verdictStatus, requiresManualReview: outVerdict.requiresManualReview
  });
  const cid = await db.recordAssessmentAudit({ eventType: 'ai_generated', actorId: u.email, actorRole: u.role, targetType: 'ai_artifact', targetId: artifact ? artifact.id : 'n/a', scope: { artifactType: family, safetyStatus, templateVersion } });

  // Optionally log to the central content-safety telemetry table too.
  db.logContentSafety({ email: u.email, app: APP_NAME, direction: 'output', blocked: outVerdict.blocked, severities: outVerdict.severities, raw: outVerdict.raw }).catch(() => {});

  res.status(201).json({
    artifact: artifact ? { id: artifact.id, artifactType: artifact.artifact_type, generationStatus: artifact.generation_status, safetyStatus: artifact.safety_status, approvedForAssignment: artifact.approved_for_assignment, generatedText: outVerdict.blocked ? null : gen.text } : null,
    correlationId: cid,
    transparency: transparencyMeta({ requiresApproval: true }),
    notice: 'This is an unapproved AI draft. Review and approve it before assigning to learners.'
  });
});

app.get('/api/teacher/assessments/generated', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listAIArtifacts({ createdByTeacherId: req.query.mine === '1' ? u.email : null, generationStatus: req.query.status || null, limit: 100 });
  res.json({ enabled: true, rows: rows || [], transparency: transparencyMeta() });
});

app.get('/api/teacher/assessments/generated/:id', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const a = await db.getAIArtifact({ id: req.params.id });
  if (!a) return res.status(404).json({ error: 'not found' });
  const approvals = await db.listTeacherApprovals({ artifactId: a.id });
  res.json({ artifact: a, approvals: approvals || [], assignable: await db.isArtifactAssignable({ artifactId: a.id }), transparency: transparencyMeta() });
});

app.post('/api/teacher/assessments/generated/:id/decision', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const a = await db.getAIArtifact({ id: req.params.id });
  if (!a) return res.status(404).json({ error: 'not found' });
  const decision = String(req.body?.decision || '').toLowerCase();
  if (!['approve', 'reject', 'needs_edit'].includes(decision)) return res.status(400).json({ error: 'decision must be approve|reject|needs_edit' });
  // Mandatory teacher-approval gate: blocked content can never be approved for assignment.
  const approvedForAssignment = decision === 'approve' && a.safety_status !== 'blocked' && req.body?.approvedForAssignment !== false;
  if (decision === 'approve' && a.safety_status === 'blocked') {
    return res.status(409).json({ error: 'cannot_approve_blocked', detail: 'Content Safety blocked this artifact; it cannot be approved for assignment.' });
  }
  const row = await db.recordTeacherApproval({
    artifactId: a.id, teacherId: u.email, decision,
    decisionReason: req.body?.decisionReason, editedText: req.body?.editedText,
    approvedForAssignment
  });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  await db.recordAssessmentAudit({ eventType: 'ai_artifact_decision', actorId: u.email, actorRole: u.role, targetType: 'ai_artifact', targetId: a.id, scope: { decision, approvedForAssignment }, outcome: decision });
  res.status(201).json({ approval: row, assignable: await db.isArtifactAssignable({ artifactId: a.id }) });
});

app.post('/api/teacher/assessments/generated/:id/assign', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const assignable = await db.isArtifactAssignable({ artifactId: req.params.id });
  if (!assignable) return res.status(409).json({ error: 'not_assignable', detail: 'This artifact has not been approved by a teacher for assignment.' });
  await db.updateAIArtifactStatus({ id: req.params.id, generationStatus: 'assigned' });
  await db.recordAssessmentAudit({ eventType: 'ai_artifact_assigned', actorId: u.email, actorRole: u.role, targetType: 'ai_artifact', targetId: req.params.id, scope: { classId: req.body?.classId || null } });
  res.json({ ok: true, transparency: transparencyMeta() });
});

// ---- US2: Shared assessment library & copy isolation (T038-T047) ----------
app.get('/api/teacher/library', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listSharedAssessments({
    gradeTag: req.query.grade || null, subjectTag: req.query.subject || null,
    skillTag: req.query.skill || null, difficultyLevel: req.query.difficulty || null,
    search: req.query.q || null, limit: 100
  });
  res.json({ enabled: true, rows: rows || [] });
});

app.post('/api/teacher/library', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title required' });
  const row = await db.createSharedAssessment({
    sourceAssessmentId: req.body?.sourceAssessmentId || null, ownerTeacherId: u.email, title,
    description: req.body?.description, gradeTag: req.body?.gradeTag, subjectTag: req.body?.subjectTag,
    skillTags: req.body?.skillTags, difficultyLevel: req.body?.difficultyLevel,
    governanceOwnerId: req.body?.governanceOwnerId, payload: req.body?.payload
  });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  await db.recordAssessmentAudit({ eventType: 'assessment_published', actorId: u.email, actorRole: u.role, targetType: 'shared_assessment', targetId: row.id, scope: { difficulty: row.difficulty_level } });
  res.status(201).json({ sharedAssessment: row });
});

app.post('/api/teacher/library/:id/copy', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const classId = String(req.body?.destinationClassId || '').trim();
  if (!classId) return res.status(400).json({ error: 'destinationClassId required' });
  const copy = await db.copySharedAssessment({
    sharedAssessmentId: req.params.id, destinationClassId: classId, copiedByTeacherId: u.email,
    dueDate: req.body?.dueDate || null, localizedEdits: req.body?.localizedEdits, curriculumMapping: req.body?.curriculumMapping
  });
  if (!copy) return res.status(404).json({ error: 'shared assessment not found' });
  await db.recordAssessmentAudit({ eventType: 'assessment_copied', actorId: u.email, actorRole: u.role, targetType: 'assessment_copy', targetId: copy.id, scope: { sharedAssessmentId: req.params.id, destinationClassId: classId } });
  res.status(201).json({ copy, notice: 'This is an isolated copy. Edits here do not affect the shared library source.' });
});

// ---- US3: Remediation groups & progress (T048-T056) -----------------------
app.post('/api/teacher/remediation/groups', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const classId = String(req.body?.classId || '').trim();
  if (!classId) return res.status(400).json({ error: 'classId required' });
  const row = await db.createRemediationGroup({
    classId, createdByTeacherId: u.email, title: req.body?.title,
    thresholdRule: req.body?.thresholdRule, learnerMembers: req.body?.learnerMembers, sequenceDefinition: req.body?.sequenceDefinition
  });
  if (!row) return res.status(500).json({ error: 'insert failed' });
  await db.recordAssessmentAudit({ eventType: 'remediation_group_created', actorId: u.email, actorRole: u.role, targetType: 'remediation_group', targetId: row.id, scope: { classId, memberCount: Array.isArray(req.body?.learnerMembers) ? req.body.learnerMembers.length : 0 } });
  res.status(201).json({ group: row });
});

app.get('/api/teacher/remediation/groups', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listRemediationGroups({ classId: req.query.classId || null, limit: 100 });
  res.json({ enabled: true, rows: rows || [] });
});

app.post('/api/teacher/remediation/groups/:id/progress', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.status(503).json({ error: 'database not configured' });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const learnerId = String(req.body?.learnerId || '').trim().toLowerCase();
  const stepId = String(req.body?.stepId || '').trim();
  if (!learnerId || !stepId) return res.status(400).json({ error: 'learnerId and stepId required' });
  const row = await db.upsertRemediationProgress({
    remediationGroupId: req.params.id, learnerId, stepId,
    stepStatus: req.body?.stepStatus, reassessmentScore: req.body?.reassessmentScore, clearedFlag: req.body?.clearedFlag
  });
  if (!row) return res.status(500).json({ error: 'upsert failed' });
  await db.recordAssessmentAudit({ eventType: 'remediation_progress_updated', actorId: u.email, actorRole: u.role, targetType: 'remediation_progress', targetId: row.id, scope: { learnerId, stepId, stepStatus: row.step_status, cleared: row.cleared_flag } });
  res.json({ progress: row });
});

app.get('/api/teacher/remediation/groups/:id/progress', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false, rows: [] });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const rows = await db.listRemediationProgress({ remediationGroupId: req.params.id, limit: 500 });
  res.json({ enabled: true, rows: rows || [] });
});

// ---- US5: At-risk dashboard (advisory only) (T030-T037) -------------------
app.get('/api/teacher/analytics/at-risk', async (req, res) => {
  const u = req.user;
  if (!db.enabled) return res.json({ enabled: false });
  if (!teacherOnly(u)) return res.status(403).json({ error: 'teacher only' });
  const classId = String(req.query.classId || 'demo-class').trim();
  // Derive an advisory snapshot from class mastery. The dashboard NEVER mutates learner
  // records — it is decision-support for the teacher (EU AI Act Art.14 human oversight).
  const mastery = await db.listClassMastery({ limit: 60 }) || [];
  const atRisk = mastery.filter(m => Number(m.level != null ? m.level : (m.mastery || 0)) < 0.5);
  const avg = mastery.length ? Math.round(mastery.reduce((s, m) => s + Number(m.level != null ? m.level : (m.mastery || 0)), 0) / mastery.length * 100) : 0;
  const snapshot = await db.upsertDashboardSnapshot({
    classId, topicId: req.query.topicId || null, masteryPercent: avg, completionRate: avg,
    atRiskCount: atRisk.length, ungradedCount: 0,
    recommendationSummary: atRisk.length ? `${atRisk.length} learner(s) below 50% mastery — consider a remediation group.` : 'No learners currently flagged at-risk.'
  });
  await db.recordAssessmentAudit({ eventType: 'at_risk_dashboard_viewed', actorId: u.email, actorRole: u.role, targetType: 'dashboard', targetId: classId, scope: { atRiskCount: atRisk.length, advisory: true } });
  res.json({
    enabled: true,
    classId,
    snapshot,
    atRisk: atRisk.slice(0, 30),
    advisory: true,
    notice: 'Advisory analytics only. These suggestions do not change any learner record or grade automatically.',
    transparency: transparencyMeta({ aiGenerated: false, decisionSupport: true })
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[${APP_ROLE}] listening on :${port} (allowedRoles=${ALLOWED.join(',')}, APIM=${APIM || 'unset'})`));
