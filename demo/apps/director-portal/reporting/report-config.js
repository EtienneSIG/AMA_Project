'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'reporting.json');

function normalizeIdList(value) {
  const list = Array.isArray(value) ? value : (value == null ? [] : [value]);
  return [...new Set(list.map(item => String(item).trim()).filter(Boolean))];
}

function normalizeReport(report) {
  if (!report || typeof report !== 'object') return null;
  const reportId = String(report.report_id || report.reportId || '').trim();
  const workspaceId = String(report.workspace_id || report.workspaceId || '').trim();
  const datasetId = String(report.dataset_id || report.datasetId || '').trim();
  const displayName = String(report.display_name || report.displayName || '').trim();
  const aggregationLevel = String(report.aggregation_level || report.aggregationLevel || '').trim();
  const sensitivityLabel = String(report.sensitivity_label || report.sensitivityLabel || '').trim();
  const allowedScopeDimensions = normalizeIdList(report.allowed_scope_dimensions || report.allowedScopeDimensions);
  if (!reportId || !workspaceId || !datasetId || !displayName || !aggregationLevel || !sensitivityLabel) return null;
  return {
    reportId,
    workspaceId,
    datasetId,
    displayName,
    allowedScopeDimensions,
    aggregationLevel,
    sensitivityLabel,
    embedUrl: String(report.embed_url || report.embedUrl || '').trim() || null,
    approved: report.approved !== false
  };
}

function normalizeFabricSettings(raw) {
  const fabric = raw && typeof raw === 'object' ? raw : {};
  return {
    workspaceName: String(fabric.workspaceName || fabric.workspace_name || '').trim() || null,
    mirroredDatabaseName: String(fabric.mirroredDatabaseName || fabric.mirrored_database_name || '').trim() || null,
    sourceConnectionId: String(fabric.sourceConnectionId || fabric.source_connection_id || '').trim() || null,
    gatewayName: String(fabric.gatewayName || fabric.gateway_name || '').trim() || null
  };
}

function loadReportingConfig(configPath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    return {
      loaded: false,
      path: configPath,
      reports: [],
      error: 'reporting configuration missing'
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const reports = Array.isArray(raw.reports) ? raw.reports.map(normalizeReport).filter(Boolean) : [];
    const defaultAggregationLevel = String(raw.defaultAggregationLevel || raw.default_aggregation_level || 'school-region').trim();
    return {
      loaded: true,
      path: configPath,
      schemaVersion: raw.schemaVersion || raw.schema_version || 1,
      defaultAggregationLevel,
      fabric: normalizeFabricSettings(raw.fabric),
      reports,
      error: reports.length ? null : 'no approved report metadata found'
    };
  } catch (error) {
    return {
      loaded: false,
      path: configPath,
      fabric: normalizeFabricSettings(null),
      reports: [],
      error: String(error && error.message || error)
    };
  }
}

function buildScopeSnapshot(user) {
  const directScope = user && user.reportingScope ? user.reportingScope : null;
  const directorAuthorization = user && user.directorAuthorization ? user.directorAuthorization : null;
  const scope = directScope || (directorAuthorization && directorAuthorization.scope) || { schoolIds: [], regionIds: [] };
  return {
    role: user ? user.role : null,
    subjectId: user ? user.email : null,
    schoolIds: normalizeIdList(scope.schoolIds),
    regionIds: normalizeIdList(scope.regionIds),
    granted: Boolean((scope.schoolIds && normalizeIdList(scope.schoolIds).length) || (scope.regionIds && normalizeIdList(scope.regionIds).length) || (directorAuthorization && directorAuthorization.granted))
  };
}

function getApprovedReportsForScope(config, scopeSnapshot) {
  const reports = config && Array.isArray(config.reports) ? config.reports : [];
  if (!scopeSnapshot || !scopeSnapshot.granted) return [];
  const schoolIds = new Set(normalizeIdList(scopeSnapshot.schoolIds));
  const regionIds = new Set(normalizeIdList(scopeSnapshot.regionIds));
  return reports.filter(report => {
    if (!report.approved) return false;
    const scopeDims = new Set(report.allowedScopeDimensions || []);
    const schoolAllowed = scopeDims.has('school') && schoolIds.size > 0;
    const regionAllowed = scopeDims.has('region') && regionIds.size > 0;
    return schoolAllowed || regionAllowed;
  });
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  buildScopeSnapshot,
  getApprovedReportsForScope,
  loadReportingConfig,
  normalizeReport
};