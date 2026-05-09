// LearnEU app server — shared across learner-web / parent-portal / teacher-console.
// Provides: cookie-session auth (./auth.js), role-gated routes, profile-aware /api/chat proxy to APIM.
'use strict';

const express = require('express');
const path = require('path');
const auth = require('./auth');

const app = express();
app.use(express.json({ limit: '64kb' }));

const ROLE_INFER = { 'app-learner-web': 'student', 'app-parent-portal': 'parent', 'app-teacher-console': 'teacher', 'app-admin': 'admin' };
const inferred = Object.entries(ROLE_INFER).find(([k]) => (process.env.WEBSITE_SITE_NAME || '').includes(k));
const APP_ROLE = process.env.APP_ROLE || (inferred ? inferred[1] : 'student');
const ALLOWED = [APP_ROLE, 'admin'];

const APIM = (process.env.APIM_GATEWAY_URL || '').replace(/\/$/, '');
const KEY  = process.env.APIM_SUBSCRIPTION_KEY || '';
const DEP  = process.env.AOAI_DEPLOYMENT_NAME || 'gpt-5.4-nano';

auth.mountAuth(app, { allowedRoles: ALLOWED });

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    role: APP_ROLE,
    apimConfigured: Boolean(APIM),
    keyConfigured: Boolean(KEY) && !KEY.startsWith('@Microsoft.KeyVault'),
    deployment: DEP,
    region: process.env.REGION_NAME || 'westeurope'
  });
});

app.use(auth.gateMiddleware(ALLOWED));
app.use(express.static(path.join(__dirname, 'public')));

function buildSystemPrompt(u) {
  const base = `You are LearnEU, an EU-compliant assistant deployed in West Europe. Respond in ${u.language || 'en'} unless the user writes in another language. Use concise markdown. If a math/process/structure diagram would clarify, include a fenced \`\`\`mermaid block (flowchart TD or graph LR — keep nodes to ASCII so it renders).`;
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
  const body = {
    messages: [
      { role: 'system', content: buildSystemPrompt(u) },
      { role: 'user', content: String(req.body?.prompt || 'Say hello.') }
    ],
    max_completion_tokens: Math.min(Number(req.body?.max_tokens) || 500, 1500)
  };
  const url = `${APIM}/aoai/openai/deployments/${encodeURIComponent(DEP)}/chat/completions?api-version=2024-08-01-preview`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': KEY },
      body: JSON.stringify(body)
    });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || !ct.includes('application/json')) {
      const text = await r.text();
      return res.status(r.status).type(ct || 'application/json').send(text);
    }
    const data = await r.json();
    res.json({
      answer: data?.choices?.[0]?.message?.content ?? '',
      model: data?.model,
      usage: data?.usage && {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      }
    });
  } catch (err) {
    res.status(502).json({ error: 'upstream error', detail: String(err) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`[${APP_ROLE}] listening on :${port} (allowedRoles=${ALLOWED.join(',')}, APIM=${APIM || 'unset'})`));
