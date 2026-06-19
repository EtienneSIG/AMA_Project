'use strict';
// Feature 009 — EU-only endpoint enforcement (constitution: EU residency, no cross-EU transfer).
// Connector onboarding and runtime calls fail CLOSED for non-EU hosts.

// Allowlisted EU TLDs + known EU cloud regions in hostnames. Conservative by design.
const EU_TLDS = ['.eu', '.fr', '.de', '.es', '.it', '.nl', '.be', '.pt', '.ie', '.at',
  '.fi', '.se', '.dk', '.pl', '.cz', '.gr', '.ro', '.hu', '.sk', '.si', '.hr', '.bg',
  '.lt', '.lv', '.ee', '.lu', '.mt', '.cy'];
const EU_REGION_HINTS = ['westeurope', 'northeurope', 'francecentral', 'francesouth',
  'germanywestcentral', 'germanynorth', 'swedencentral', 'norwayeast', 'switzerlandnorth',
  'eu-west', 'eu-central', 'eu-north', 'eu-south', 'europe-west', 'europe-north'];

function hostnameOf(endpoint) {
  try { return new URL(endpoint).hostname.toLowerCase(); } catch { return null; }
}

// Returns { ok, host, reason }. Localhost is permitted for the demo (in-process simulation).
function isEuEndpoint(endpoint) {
  if (!endpoint) return { ok: false, host: null, reason: 'missing endpoint' };
  const host = hostnameOf(endpoint);
  if (!host) return { ok: false, host: null, reason: 'unparseable endpoint' };
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return { ok: true, host, reason: 'local (demo in-process)' };
  }
  if (EU_REGION_HINTS.some(h => host.includes(h))) return { ok: true, host, reason: 'EU region hint' };
  if (EU_TLDS.some(t => host.endsWith(t))) return { ok: true, host, reason: 'EU TLD' };
  return { ok: false, host, reason: 'non-EU or unverifiable host — blocked (no cross-EU transfer)' };
}

function assertEuEndpoint(endpoint) {
  const r = isEuEndpoint(endpoint);
  if (!r.ok) { const e = new Error('eu_endpoint_blocked: ' + r.reason); e.code = 'EU_ENDPOINT_BLOCKED'; throw e; }
  return r;
}

module.exports = { isEuEndpoint, assertEuEndpoint };
