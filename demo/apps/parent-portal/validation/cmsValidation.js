// Feature 010 — Shared validation helpers for CMS governance.
// Pure functions, no I/O. Used by routes and services to fail closed on
// malformed semantic versions, unsupported locales, and unknown role claims.

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
// BCP-47-ish: language(-Script)?(-REGION)? — kept permissive but bounded.
const LOCALE_RE = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/;

const SUPPORTED_LOCALES = Object.freeze([
  'nl-NL', 'fr-FR', 'fr-BE', 'de-DE', 'es-ES', 'it-IT', 'pt-PT',
  'pl-PL', 'sv-SE', 'fi-FI', 'da-DK', 'el-GR', 'cs-CZ', 'ro-RO',
  'nl-BE', 'en-IE',
]);

const ROLES = Object.freeze(['pedagogy_lead', 'compliance_lead', 'localization_lead', 'curriculum_lead']);

function isSemanticVersion(v) {
  return typeof v === 'string' && SEMVER_RE.test(v);
}

function assertSemanticVersion(v) {
  if (!isSemanticVersion(v)) {
    const e = new Error('INVALID_SEMANTIC_VERSION');
    e.code = 'INVALID_SEMANTIC_VERSION';
    e.detail = String(v);
    throw e;
  }
  return v;
}

// Returns the next version given a bump type. Defaults to a patch bump.
function bumpVersion(v, type = 'patch') {
  assertSemanticVersion(v);
  const [maj, min, pat] = v.split('.').map(Number);
  if (type === 'major') return `${maj + 1}.0.0`;
  if (type === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

function isSupportedLocale(loc) {
  return typeof loc === 'string' && LOCALE_RE.test(loc) && SUPPORTED_LOCALES.includes(loc);
}

function assertLocale(loc) {
  if (!isSupportedLocale(loc)) {
    const e = new Error('UNSUPPORTED_LOCALE');
    e.code = 'UNSUPPORTED_LOCALE';
    e.detail = String(loc);
    throw e;
  }
  return loc;
}

function isGovernanceRole(role) {
  return ROLES.includes(role);
}

// Publish-time metadata completeness gate (FR / Art. 10 data governance).
const REQUIRED_METADATA_FIELDS = Object.freeze(['curriculum_standard', 'subject', 'grade_level', 'learning_objective']);

function metadataCompleteness(meta) {
  const missing = REQUIRED_METADATA_FIELDS.filter((f) => !meta || meta[f] == null || String(meta[f]).trim() === '');
  return { complete: missing.length === 0, missing };
}

module.exports = {
  SUPPORTED_LOCALES,
  ROLES,
  REQUIRED_METADATA_FIELDS,
  isSemanticVersion,
  assertSemanticVersion,
  bumpVersion,
  compareVersions,
  isSupportedLocale,
  assertLocale,
  isGovernanceRole,
  metadataCompleteness,
};
