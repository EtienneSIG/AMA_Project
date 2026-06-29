// Azure AI Speech (STT + TTS) over AAD. disableLocalAuth is enforced, so we mint an
// AAD token and use the `aad#<resourceId>#<token>` Authorization scheme. EU-region only.
'use strict';

const REGION = process.env.SPEECH_REGION || 'northeurope';
const RESOURCE_ID = process.env.SPEECH_RESOURCE_ID || '';
const SCOPE = 'https://cognitiveservices.azure.com/.default';
const enabled = Boolean(RESOURCE_ID && REGION);

let _credential = null, _tokenCache = null;
function getCredential() {
  if (_credential) return _credential;
  try { const { DefaultAzureCredential } = require('@azure/identity'); _credential = new DefaultAzureCredential(); } catch { _credential = null; }
  return _credential;
}
async function authHeader() {
  const cred = getCredential(); if (!cred) return null;
  const now = Date.now();
  if (!_tokenCache || _tokenCache.expiresOnTimestamp - now < 60_000) _tokenCache = await cred.getToken(SCOPE);
  if (!_tokenCache) return null;
  return `aad#${RESOURCE_ID}#${_tokenCache.token}`;
}

// Speech-to-text (short audio REST). audioBuffer = wav/ogg/webm; returns transcript text.
async function transcribe(audioBuffer, contentType = 'audio/webm; codecs=opus', lang = 'en-GB') {
  if (!enabled) return { ran: false, text: '' };
  const auth = await authHeader(); if (!auth) return { ran: false, text: '' };
  const url = `https://${REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(lang)}`;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: auth, 'Content-Type': contentType, Accept: 'application/json' }, body: audioBuffer });
  if (!r.ok) return { ran: true, text: '', error: r.status };
  const j = await r.json().catch(() => ({}));
  return { ran: true, text: j.DisplayText || '', region: REGION };
}

// Text-to-speech; returns mp3 Buffer. EU-region voice.
async function synthesize(text, voice = 'en-GB-OliviaNeural', lang = 'en-GB') {
  if (!enabled) return null;
  const auth = await authHeader(); if (!auth) return null;
  const ssml = `<speak version='1.0' xml:lang='${lang}'><voice xml:lang='${lang}' name='${voice}'>${String(text).replace(/[<&]/g, c => c === '<' ? '&lt;' : '&amp;')}</voice></speak>`;
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3' }, body: ssml });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer());
}

module.exports = { enabled, region: REGION, transcribe, synthesize };
