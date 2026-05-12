// Azure AI Content Safety client (Managed Identity / DefaultAzureCredential).
// disableLocalAuth is forced ON by Azure Policy, so we authenticate via AAD.
// Endpoint comes from CONTENT_SAFETY_ENDPOINT. CONTENT_SAFETY_ENABLED gates the call.
'use strict';

const ENDPOINT = (process.env.CONTENT_SAFETY_ENDPOINT || '').replace(/\/$/, '');
const ENABLED_FLAG = (process.env.CONTENT_SAFETY_ENABLED || 'true').toLowerCase() !== 'false';
const THRESHOLD = parseInt(process.env.CONTENT_SAFETY_THRESHOLD || '4', 10);

const enabled = Boolean(ENDPOINT && ENABLED_FLAG);

const CATEGORIES = ['Hate', 'SelfHarm', 'Sexual', 'Violence'];
const SCOPE = 'https://cognitiveservices.azure.com/.default';

let _credential = null;
let _tokenCache = null; // { token, expiresOnTimestamp }

function getCredential() {
  if (_credential) return _credential;
  try {
    const { DefaultAzureCredential } = require('@azure/identity');
    _credential = new DefaultAzureCredential();
  } catch (e) {
    _credential = null;
  }
  return _credential;
}

async function getToken() {
  const cred = getCredential();
  if (!cred) return null;
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresOnTimestamp - now > 60_000) return _tokenCache.token;
  const t = await cred.getToken(SCOPE);
  if (!t) return null;
  _tokenCache = t;
  return t.token;
}

async function analyze(text) {
  if (!enabled) return { ran: false, blocked: false, severities: {}, raw: null };
  let token;
  try {
    token = await getToken();
  } catch (e) {
    return { ran: true, blocked: false, severities: {}, raw: { error: 'token: ' + String(e).slice(0, 200) } };
  }
  if (!token) return { ran: false, blocked: false, severities: {}, raw: { error: 'no credential available' } };
  const body = { text: String(text || '').slice(0, 8000), categories: CATEGORIES, outputType: 'FourSeverityLevels' };
  const url = `${ENDPOINT}/contentsafety/text:analyze?api-version=2024-09-01`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      return { ran: true, blocked: false, severities: {}, raw: { error: r.status, body: err.slice(0, 500) } };
    }
    const data = await r.json();
    const severities = {};
    for (const c of data.categoriesAnalysis || []) severities[c.category] = c.severity;
    const blocked = Object.values(severities).some(s => s >= THRESHOLD);
    return { ran: true, blocked, severities, threshold: THRESHOLD, raw: data };
  } catch (e) {
    return { ran: true, blocked: false, severities: {}, raw: { error: String(e) } };
  }
}

module.exports = { enabled, analyze, threshold: THRESHOLD, endpoint: ENDPOINT };
