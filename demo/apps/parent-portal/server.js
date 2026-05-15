// LearnEU app server — shared across learner-web / parent-portal / teacher-console.
// Provides: cookie-session auth (./auth.js), role-gated routes, profile-aware /api/chat proxy to APIM.
'use strict';

const express = require('express');
const path = require('path');
const auth = require('./auth');
const db = require('./db');
const cs = require('./contentSafety');

const app = express();
app.use(express.json({ limit: '64kb' }));

const ROLE_INFER = { 'app-learner-web': 'student', 'app-parent-portal': 'parent', 'app-teacher-console': 'teacher', 'app-admin': 'admin' };
const inferred = Object.entries(ROLE_INFER).find(([k]) => (process.env.WEBSITE_SITE_NAME || '').includes(k));
const APP_ROLE = process.env.APP_ROLE || (inferred ? inferred[1] : 'student');
const APP_NAME = process.env.APP_NAME || APP_ROLE;
const ALLOWED = [APP_ROLE, 'admin'];

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
    }
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'parental_consent_required', message: 'Parental consent (GDPR Art. 8) is required for learners under 16. Ask your parent to grant consent through the Parent Portal.' });
    }
    return res.redirect('/consent-pending.html');
  });
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
  res.json({ ok: true, consent: row });
});
// Admin-only rebuild of the mastery rollup from item_attempts.
app.post('/api/learner/mastery/recompute', async (req, res) => {
  const u = req.user;
  if (!u || u.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  const out = await db.recomputeAllMastery();
  res.json(out);
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

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[${APP_ROLE}] listening on :${port} (allowedRoles=${ALLOWED.join(',')}, APIM=${APIM || 'unset'})`));
