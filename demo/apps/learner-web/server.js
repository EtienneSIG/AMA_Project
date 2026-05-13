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
app.use(express.static(path.join(__dirname, 'public')));

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

    res.json({
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
