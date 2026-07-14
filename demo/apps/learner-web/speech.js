// Azure AI Speech (STT + TTS) over AAD. disableLocalAuth is enforced, so we mint an
// AAD token and use the `aad#<resourceId>#<token>` Authorization scheme. EU-region only.
'use strict';

const REGION = process.env.SPEECH_REGION || 'northeurope';
const RESOURCE_ID = process.env.SPEECH_RESOURCE_ID || '';
const SCOPE = 'https://cognitiveservices.azure.com/.default';
const enabled = Boolean(RESOURCE_ID && REGION);
// Entra ID auth for the STT short-audio REST endpoint only works against the
// resource's CUSTOM DOMAIN with a plain `Authorization: Bearer <token>` header —
// the regional `<region>.stt.speech.microsoft.com` host rejects the `aad#…`
// scheme with 401 (TTS regional accepts it, STT does not). Derive the custom
// domain from the account name in the resource id, or override via env.
const ACCOUNT_NAME = (RESOURCE_ID.split('/').pop() || '').trim();
const CUSTOM_DOMAIN = (process.env.SPEECH_CUSTOM_DOMAIN || ACCOUNT_NAME || '').trim();

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

// Speech-to-text (short audio REST). audioBuffer = wav (PCM 16 kHz mono) or ogg/opus.
// Uses the custom-domain endpoint with a Bearer AAD token (see CUSTOM_DOMAIN note).
async function transcribe(audioBuffer, contentType = 'audio/wav', lang = 'en-GB') {
  if (!enabled) return { ran: false, text: '' };
  const cred = getCredential(); if (!cred) return { ran: false, text: '' };
  const now = Date.now();
  if (!_tokenCache || _tokenCache.expiresOnTimestamp - now < 60_000) _tokenCache = await cred.getToken(SCOPE);
  if (!_tokenCache) return { ran: false, text: '' };
  const useCustom = Boolean(CUSTOM_DOMAIN);
  const host = useCustom ? `${CUSTOM_DOMAIN}.cognitiveservices.azure.com` : `${REGION}.stt.speech.microsoft.com`;
  const path = useCustom ? '/stt/speech/recognition/conversation/cognitiveservices/v1' : '/speech/recognition/conversation/cognitiveservices/v1';
  const authValue = useCustom ? `Bearer ${_tokenCache.token}` : `aad#${RESOURCE_ID}#${_tokenCache.token}`;
  const url = `https://${host}${path}?language=${encodeURIComponent(lang)}`;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: authValue, 'Content-Type': contentType, Accept: 'application/json' }, body: audioBuffer });
  if (!r.ok) return { ran: true, text: '', error: r.status };
  const j = await r.json().catch(() => ({}));
  return { ran: true, text: j.DisplayText || '', region: REGION, recognitionStatus: j.RecognitionStatus };
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
