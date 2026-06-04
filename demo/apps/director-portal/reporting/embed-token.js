'use strict';

const POWER_BI_SCOPE = 'https://analysis.windows.net/powerbi/api/.default';
const POWER_BI_BASE = 'https://api.powerbi.com/v1.0/myorg';

let cachedAccessToken = null;
let cachedTokenExpiresAt = 0;

function getEmbedCredentialState() {
  const tenantId = String(process.env.PBI_TENANT_ID || '').trim();
  const clientId = String(process.env.PBI_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PBI_CLIENT_SECRET || '').trim();
  const missing = [];
  if (!tenantId) missing.push('PBI_TENANT_ID');
  if (!clientId) missing.push('PBI_CLIENT_ID');
  if (!clientSecret) missing.push('PBI_CLIENT_SECRET');
  return {
    configured: missing.length === 0,
    tenantId,
    clientId,
    clientSecret,
    missing
  };
}

async function acquirePowerBiAccessToken() {
  const state = getEmbedCredentialState();
  if (!state.configured) {
    const error = new Error(`Missing Power BI embed credentials: ${state.missing.join(', ')}`);
    error.code = 'embed_credentials_missing';
    throw error;
  }
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt) return cachedAccessToken;

  const body = new URLSearchParams({
    client_id: state.clientId,
    client_secret: state.clientSecret,
    grant_type: 'client_credentials',
    scope: POWER_BI_SCOPE
  });

  const tokenResponse = await fetch(`https://login.microsoftonline.com/${state.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    const error = new Error(tokenPayload.error_description || tokenPayload.error || `Power BI AAD token request failed (${tokenResponse.status})`);
    error.code = 'aad_token_failed';
    throw error;
  }

  const expiresInSec = Number(tokenPayload.expires_in || 3600);
  cachedAccessToken = tokenPayload.access_token;
  cachedTokenExpiresAt = Date.now() + Math.max(expiresInSec - 120, 60) * 1000;
  return cachedAccessToken;
}

async function generateEmbedConfig(report) {
  const accessToken = await acquirePowerBiAccessToken();
  const response = await fetch(`${POWER_BI_BASE}/groups/${encodeURIComponent(report.workspaceId)}/reports/${encodeURIComponent(report.reportId)}/GenerateToken`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      accessLevel: 'View',
      allowSaveAs: false,
      datasetId: report.datasetId
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token) {
    const error = new Error(payload.message || payload.error?.message || `Power BI embed token request failed (${response.status})`);
    error.code = 'embed_token_failed';
    throw error;
  }

  return {
    reportId: report.reportId,
    datasetId: report.datasetId,
    workspaceId: report.workspaceId,
    embedUrl: report.embedUrl,
    accessToken: payload.token,
    tokenType: 'Embed',
    expiration: payload.expiration || null
  };
}

module.exports = {
  generateEmbedConfig,
  getEmbedCredentialState
};