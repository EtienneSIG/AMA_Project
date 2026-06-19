'use strict';
// Feature 009 — SSO / OIDC federation. Validates IdP metadata (issuer/jwks must be EU hosts),
// maps provider claims to a learner identity, and never grants access before the consent gate.
const { isEuEndpoint } = require('./eu-endpoint');

// Validate IdP federation metadata. Returns { ok, reason }.
function validateMetadata({ issuer, jwksUri, claimMap }) {
  if (!issuer) return { ok: false, reason: 'missing issuer' };
  const iss = isEuEndpoint(issuer);
  if (!iss.ok) return { ok: false, reason: 'issuer not EU-resident: ' + iss.reason };
  if (jwksUri) { const j = isEuEndpoint(jwksUri); if (!j.ok) return { ok: false, reason: 'jwks not EU-resident: ' + j.reason }; }
  if (!claimMap || !claimMap.email) return { ok: false, reason: 'claim map must map an email claim' };
  return { ok: true };
}

// Map IdP claims -> { learnerEmail, subject }. Pure; performs no side effects.
function mapClaims(claims, claimMap) {
  const emailClaim = (claimMap && claimMap.email) || 'email';
  const subjectClaim = (claimMap && claimMap.subject) || 'sub';
  const learnerEmail = String(claims[emailClaim] || '').toLowerCase();
  const subject = String(claims[subjectClaim] || '');
  return { learnerEmail, subject };
}

module.exports = { validateMetadata, mapClaims };
