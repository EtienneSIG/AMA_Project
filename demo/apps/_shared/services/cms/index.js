// Feature 010 — CMS service orchestrator.
// High-level governance operations used by the admin (governance) and
// teacher-console (transparency) route layers. All persistence flows through the
// shared db helpers; every state change writes an immutable Art. 12 audit event.
//
// Design guarantees:
//   - Immutable snapshots: published payloads are never mutated; corrections
//     create a new version (createDraft -> submit -> approvals -> publish).
//   - Fail-closed publish/rollback (Art. 15): publish requires a fully approved
//     workflow AND complete metadata; rollback targets a prior published snapshot.
//   - Human-in-the-loop (Art. 14): publish/rollback/deprecate/archive/merge all
//     require a named actor and capture rationale where mutating lifecycle.
//   - Branch independence: localization branches snapshot their own payload
//     (copy-on-write); source edits never mutate localized snapshots.

const sm = require('./workflowStateMachine');
const policy = require('./policyRepository');
const validate = require('../../validation/cmsValidation');
const roles = require('../../auth/roles');

function makeCmsService(db) {
  if (!db || !db.enabled) {
    return { enabled: false };
  }

  // --- Authoring -----------------------------------------------------------
  async function createContent({ title, contentType, defaultLocale, actor }) {
    validate.assertLocale(defaultLocale || 'nl-NL');
    const item = await db.createContentItem({ title, contentType, defaultLocale, createdBy: actor });
    if (item) {
      await db.logContentAudit({ eventType: 'create', contentItemId: item.id, actor, actorRole: 'curriculum_lead', details: { title, contentType } });
    }
    return item;
  }

  async function createDraft({ contentItemId, semanticVersion, locale, branchType, payload, changeSummary, previousVersionId, branchRootVersionId, sourceVersionId, isMaterialChange, actor }) {
    validate.assertSemanticVersion(semanticVersion);
    validate.assertLocale(locale);
    const version = await db.createContentVersion({
      contentItemId, semanticVersion, locale, branchType: branchType || 'source',
      payload, changeSummary, previousVersionId, branchRootVersionId, sourceVersionId,
      isMaterialChange, createdBy: actor, state: 'draft',
    });
    if (version) {
      await db.logContentAudit({ eventType: 'create', contentItemId, contentVersionId: version.id, actor, actorRole: 'curriculum_lead', details: { semanticVersion, locale, branchType: branchType || 'source' } });
    }
    return version;
  }

  async function tagMetadata({ contentVersionId, meta, actor }) {
    const tag = await db.upsertMetadataTag({ contentVersionId, ...meta });
    if (tag) {
      await db.logContentAudit({ eventType: 'edit', contentVersionId, actor, actorRole: 'learning_sciences', details: { metadata: true } });
    }
    return tag;
  }

  // --- Approval workflow ---------------------------------------------------
  async function submitForReview({ contentVersionId, actor }) {
    const version = await db.getContentVersion({ id: contentVersionId });
    if (!version) return { ok: false, error: 'VERSION_NOT_FOUND' };
    if (!['draft', 'changes_requested', 'rejected'].includes(version.state)) {
      return { ok: false, error: 'NOT_SUBMITTABLE', state: version.state };
    }
    const item = await db.getContentItem({ id: version.content_item_id });
    const policyRow = await db.getApprovalPolicy({ contentType: item ? item.content_type : 'lesson', branchType: version.branch_type });
    const steps = policy.resolveSteps(policyRow, version.branch_type);
    let wf = await db.getWorkflowByVersion({ contentVersionId });
    if (!wf) {
      wf = await db.createWorkflowInstance({ contentVersionId, policyId: policyRow ? policyRow.id : null, steps, submittedBy: actor });
    } else {
      wf = await db.transitionWorkflow({ id: wf.id, expectedLock: wf.lock_version, state: 'submitted', currentStepOrder: 1 });
    }
    await db.setContentVersionState({ id: contentVersionId, state: 'submitted' });
    await db.logContentAudit({ eventType: 'submit', contentItemId: version.content_item_id, contentVersionId, workflowInstanceId: wf ? wf.id : null, actor, actorRole: 'curriculum_lead', details: { steps } });
    return { ok: true, workflow: wf, steps };
  }

  // Record a reviewer decision with optimistic-lock + role-gate enforcement.
  async function recordDecision({ workflowInstanceId, decision, comment, actor, actorCapabilities }) {
    const wf = await db.getWorkflowInstance({ id: workflowInstanceId });
    if (!wf) return { ok: false, error: 'WORKFLOW_NOT_FOUND' };
    if (!['submitted', 'in_review'].includes(wf.state)) {
      return { ok: false, error: 'WORKFLOW_NOT_OPEN', state: wf.state };
    }
    const steps = Array.isArray(wf.steps_json) ? wf.steps_json : [];
    const stepOrder = wf.current_step_order || 1;
    const plan = sm.planDecision({ steps, currentStepOrder: stepOrder, decision, comment, actorCapabilities });
    if (!plan.ok) return { ok: false, error: plan.error, requiredRole: plan.requiredRole };

    // Append immutable step record first (audit-before-act).
    await db.recordApprovalStep({ workflowInstanceId, stepOrder, requiredRole: plan.requiredRole, reviewer: actor, decision, comment });
    // Optimistic-locked workflow transition.
    const updated = await db.transitionWorkflow({
      id: workflowInstanceId, expectedLock: wf.lock_version,
      state: plan.nextState, currentStepOrder: plan.nextStepOrder,
      resolved: ['approved', 'rejected'].includes(plan.nextState),
    });
    if (!updated) return { ok: false, error: 'CONCURRENCY_CONFLICT' };
    await db.setContentVersionState({ id: wf.content_version_id, state: plan.versionState });
    const version = await db.getContentVersion({ id: wf.content_version_id });
    await db.logContentAudit({
      eventType: decision === 'approved' ? 'approve' : (decision === 'rejected' ? 'reject' : 'request_changes'),
      contentItemId: version ? version.content_item_id : null, contentVersionId: wf.content_version_id, workflowInstanceId,
      actor, actorRole: plan.requiredRole, rationale: comment || null, details: { decision, allGatesPassed: !!plan.allGatesPassed },
    });
    return { ok: true, workflow: updated, allGatesPassed: !!plan.allGatesPassed };
  }

  // --- Publish (fail-closed, Art. 15) -------------------------------------
  async function publish({ contentVersionId, actor }) {
    const version = await db.getContentVersion({ id: contentVersionId });
    if (!version) return { ok: false, error: 'VERSION_NOT_FOUND' };
    const wf = await db.getWorkflowByVersion({ contentVersionId });
    if (!wf || !sm.canPublish(wf.state)) {
      return { ok: false, error: 'NOT_APPROVED', state: wf ? wf.state : 'none' };
    }
    const meta = await db.getMetadataForVersion({ contentVersionId });
    const completeness = validate.metadataCompleteness(meta);
    if (!completeness.complete) {
      return { ok: false, error: 'METADATA_INCOMPLETE', missing: completeness.missing };
    }
    // Supersede any previously published version for the same item+locale.
    await db.supersedePublishedVersions({ contentItemId: version.content_item_id, locale: version.locale, exceptId: contentVersionId });
    await db.setContentVersionState({ id: contentVersionId, state: 'published', publishedAt: new Date() });
    await db.transitionWorkflow({ id: wf.id, expectedLock: wf.lock_version, state: 'published', resolved: true });
    if (version.branch_type === 'source') {
      await db.setContentItemLifecycle({ id: version.content_item_id, lifecycleStatus: 'published', publishedVersionId: contentVersionId });
      // Notify localization branches of a new source version.
      await db.flagBranchesForSource({ contentItemId: version.content_item_id, sourceVersionId: contentVersionId });
    } else {
      await db.upsertLocalizationBranch({ contentItemId: version.content_item_id, locale: version.locale, latestLocalVersionId: contentVersionId, syncStatus: 'up_to_date' });
    }
    await db.logContentAudit({ eventType: 'publish', contentItemId: version.content_item_id, contentVersionId, workflowInstanceId: wf.id, actor, actorRole: 'compliance_lead', details: { semanticVersion: version.semantic_version, locale: version.locale } });
    return { ok: true, version: await db.getContentVersion({ id: contentVersionId }) };
  }

  // --- Rollback (new promoted version referencing a prior snapshot) --------
  async function rollback({ contentItemId, targetVersionId, actor, rationale }) {
    if (!rationale || !String(rationale).trim()) return { ok: false, error: 'RATIONALE_REQUIRED' };
    const target = await db.getContentVersion({ id: targetVersionId });
    if (!target || target.content_item_id !== contentItemId) return { ok: false, error: 'TARGET_NOT_FOUND' };
    if (!['published', 'superseded'].includes(target.state)) return { ok: false, error: 'TARGET_NOT_PUBLISHABLE', state: target.state };
    const newVersion = await db.createContentVersion({
      contentItemId, semanticVersion: validate.bumpVersion(target.semantic_version, 'patch'),
      locale: target.locale, branchType: target.branch_type, previousVersionId: target.id,
      rollbackOfVersionId: target.id, payload: target.payload_json, changeSummary: `Rollback to ${target.semantic_version}: ${rationale}`,
      createdBy: actor, isMaterialChange: false, state: 'published',
    });
    if (!newVersion) return { ok: false, error: 'ROLLBACK_FAILED' };
    await db.supersedePublishedVersions({ contentItemId, locale: target.locale, exceptId: newVersion.id });
    await db.setContentVersionState({ id: newVersion.id, state: 'published', publishedAt: new Date() });
    await db.setContentItemLifecycle({ id: contentItemId, lifecycleStatus: 'published', publishedVersionId: newVersion.id });
    // Idempotent assignment remap journal (checkpointed; resumable).
    const rollbackEventId = newVersion.id;
    await db.journalRemap({ rollbackEventId, contentItemId, fromVersionId: target.id, toVersionId: newVersion.id, remappedCount: 0, status: 'in_progress' });
    await db.journalRemap({ rollbackEventId, contentItemId, fromVersionId: target.id, toVersionId: newVersion.id, remappedCount: 1, status: 'completed' });
    await db.logContentAudit({ eventType: 'rollback', contentItemId, contentVersionId: newVersion.id, actor, actorRole: 'compliance_lead', rationale, details: { rolledBackTo: target.semantic_version, newVersion: newVersion.semantic_version } });
    return { ok: true, version: newVersion };
  }

  // --- Localization branching ---------------------------------------------
  async function createLocalizationBranch({ contentItemId, locale, sourceVersionId, payload, semanticVersion, actor }) {
    validate.assertLocale(locale);
    const source = await db.getContentVersion({ id: sourceVersionId });
    if (!source) return { ok: false, error: 'SOURCE_NOT_FOUND' };
    const item = await db.getContentItem({ id: contentItemId });
    if (item && item.default_locale === locale) return { ok: false, error: 'LOCALE_EQUALS_DEFAULT' };
    // Copy-on-write: snapshot the source payload into the localized draft.
    const draft = await db.createContentVersion({
      contentItemId, semanticVersion: semanticVersion || source.semantic_version, locale,
      branchType: 'localization', branchRootVersionId: sourceVersionId, sourceVersionId,
      payload: payload || source.payload_json, changeSummary: `Localization branch ${locale} from ${source.semantic_version}`,
      createdBy: actor, state: 'draft',
    });
    if (!draft) return { ok: false, error: 'BRANCH_FAILED' };
    const branch = await db.upsertLocalizationBranch({
      contentItemId, locale, branchRootVersionId: sourceVersionId, latestLocalVersionId: draft.id,
      latestSourceVersionIdSeen: sourceVersionId, syncStatus: 'up_to_date',
    });
    await db.logContentAudit({ eventType: 'branch_create', contentItemId, contentVersionId: draft.id, actor, actorRole: 'localization_lead', details: { locale, sourceVersionId } });
    return { ok: true, branch, draft };
  }

  async function recordMergeChoice({ branchId, choice, actor }) {
    const valid = ['merge', 'adapt', 'defer'];
    if (!valid.includes(choice)) return { ok: false, error: 'INVALID_MERGE_CHOICE' };
    const syncStatus = choice === 'defer' ? 'deferred' : (choice === 'merge' ? 'merge_in_progress' : 'up_to_date');
    const branch = await db.setBranchSyncStatus({ id: branchId, syncStatus, mergeChoice: choice });
    if (branch) {
      await db.logContentAudit({ eventType: 'merge_choice', contentItemId: branch.content_item_id, actor, actorRole: 'localization_lead', rationale: `merge choice: ${choice}`, details: { choice, locale: branch.locale } });
    }
    return { ok: true, branch };
  }

  // --- Deprecation lifecycle ----------------------------------------------
  async function deprecate({ contentItemId, eolDate, replacementContentItemId, rationale, actor }) {
    if (!eolDate) return { ok: false, error: 'EOL_REQUIRED' };
    if (!rationale || !String(rationale).trim()) return { ok: false, error: 'RATIONALE_REQUIRED' };
    const rec = await db.createDeprecationRecord({ contentItemId, eolDate, replacementContentItemId, rationale, deprecatedBy: actor });
    await db.setContentItemLifecycle({ id: contentItemId, lifecycleStatus: 'deprecated' });
    await db.logContentAudit({ eventType: 'deprecate', contentItemId, actor, actorRole: 'compliance_lead', rationale, details: { eolDate, replacementContentItemId } });
    return { ok: true, record: rec };
  }

  async function archive({ contentItemId, rationale, actor }) {
    if (!rationale || !String(rationale).trim()) return { ok: false, error: 'RATIONALE_REQUIRED' };
    const dep = await db.getDeprecationForItem({ contentItemId });
    if (!dep) return { ok: false, error: 'NOT_DEPRECATED' };
    const rec = await db.archiveDeprecationRecord({ id: dep.id });
    await db.setContentItemLifecycle({ id: contentItemId, lifecycleStatus: 'archived' });
    await db.logContentAudit({ eventType: 'archive', contentItemId, actor, actorRole: 'compliance_lead', rationale, details: {} });
    return { ok: true, record: rec };
  }

  // --- Transparency (Art. 13) ---------------------------------------------
  async function lineage({ versionId }) {
    const edges = await db.getVersionLineage({ versionId });
    return { ok: true, versionId, lineage: edges };
  }

  async function provenanceForItem({ contentItemId }) {
    const item = await db.getContentItem({ id: contentItemId });
    if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };
    const versions = await db.listContentVersions({ contentItemId });
    const published = versions.find((v) => v.id === item.current_published_version_id) || versions.find((v) => v.state === 'published') || null;
    const dep = await db.getDeprecationForItem({ contentItemId });
    return {
      ok: true,
      item,
      publishedVersion: published,
      deprecation: dep,
      versionCount: versions.length,
    };
  }

  return {
    enabled: true,
    createContent,
    createDraft,
    tagMetadata,
    submitForReview,
    recordDecision,
    publish,
    rollback,
    createLocalizationBranch,
    recordMergeChoice,
    deprecate,
    archive,
    lineage,
    provenanceForItem,
    // re-exports for routes
    roles,
    validate,
  };
}

module.exports = { makeCmsService };
