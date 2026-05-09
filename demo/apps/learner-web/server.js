// Minimal LearnEU demo server. Serves a static page and proxies /api/chat to APIM (which forwards to AOAI via MI).
// Production: add OAuth on this app (Entra CIAM for parent-portal/learner-web; workforce tenant for teacher-console),
// per-user audit logging, content-safety pre-flight, language localisation pipeline.

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ROLE = process.env.APP_ROLE || 'unknown';
const APIM = (process.env.APIM_GATEWAY_URL || '').replace(/\/$/, '');
const KEY = process.env.APIM_SUBSCRIPTION_KEY || '';
const DEP = process.env.AOAI_DEPLOYMENT_NAME || 'gpt-5.4-nano';

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    role: ROLE,
    apimConfigured: Boolean(APIM),
    keyConfigured: Boolean(KEY) && !KEY.startsWith('@Microsoft.KeyVault'),
    deployment: DEP,
    region: process.env.REGION_NAME || 'westeurope'
  });
});

app.post('/api/chat', async (req, res) => {
  if (!APIM || !KEY) {
    return res.status(503).json({ error: 'APIM environment not configured' });
  }
  if (KEY.startsWith('@Microsoft.KeyVault')) {
    return res.status(503).json({ error: 'Key Vault reference not yet resolved by App Service. Restart the app.' });
  }
  const body = {
    messages: Array.isArray(req.body?.messages) && req.body.messages.length
      ? req.body.messages
      : [
          { role: 'system', content: `You are a careful EU-compliant assistant for the ${ROLE} role.` },
          { role: 'user', content: req.body?.prompt || 'Say hello in a friendly way.' }
        ],
    max_completion_tokens: Math.min(Number(req.body?.max_tokens) || 200, 1000)
  };
  const url = `${APIM}/aoai/openai/deployments/${encodeURIComponent(DEP)}/chat/completions?api-version=2024-08-01-preview`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KEY
      },
      body: JSON.stringify(body)
    });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || !ct.includes('application/json')) {
      const text = await r.text();
      return res.status(r.status).type(ct || 'application/json').send(text);
    }
    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content ?? '';
    res.json({
      answer,
      model: data?.model,
      usage: data?.usage ? {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      } : undefined
    });
  } catch (err) {
    res.status(502).json({ error: 'upstream error', detail: String(err) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`[${ROLE}] listening on :${port} (APIM=${APIM || 'unset'})`);
});
