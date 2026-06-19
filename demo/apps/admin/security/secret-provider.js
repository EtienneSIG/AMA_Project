'use strict';
// Feature 009 — Managed-identity secret provider / Key Vault reference resolver.
// Secrets are NEVER stored in the DB or source. Connectors store a *reference*
// like "@KeyVault(name=kv-learneu;secret=sis-token)". At call time the reference is
// resolved via managed identity. In the demo (no Key Vault bound) we resolve to a
// non-functional placeholder so flows run without ever exposing a real secret.

const REF_RE = /^@KeyVault\(name=([^;]+);secret=([^)]+)\)$/;

function isSecretReference(value) {
  return typeof value === 'string' && REF_RE.test(value.trim());
}

// Validate that a connector's secret field is a reference, not a plaintext secret.
function assertReferenceOnly(value, label = 'secret') {
  if (value == null || value === '') return; // optional
  if (!isSecretReference(value)) {
    const e = new Error(`plaintext_secret_rejected: ${label} must be a Key Vault reference`);
    e.code = 'PLAINTEXT_SECRET_REJECTED';
    throw e;
  }
}

// Demo resolver: returns a placeholder; in production this calls Key Vault via DefaultAzureCredential.
async function resolveSecret(reference) {
  if (!isSecretReference(reference)) return null;
  const [, vault, secret] = reference.trim().match(REF_RE);
  // Never log the resolved value. Demo returns a deterministic non-secret placeholder.
  return { vault, secret, resolved: false, value: null, note: 'demo: no Key Vault bound; reference validated only' };
}

module.exports = { isSecretReference, assertReferenceOnly, resolveSecret };
