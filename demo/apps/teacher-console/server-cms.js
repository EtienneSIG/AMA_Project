'use strict';
// Feature 010 — CMS transparency routes (teacher surface).
// Mounted by the shared server.js for teacher-console (and admin, which also
// runs governance routes from its bespoke server.js).
//
// Compliance posture:
//   - Read-only transparency (AI Act Art. 13): version provenance, approval
//     rationale visibility, deprecation/EOL warnings. No lifecycle mutation here.
//   - Teachers see *why* content is at its current version and whether it is
//     deprecated, supporting human oversight of what is assigned to learners.

const { makeCmsService } = require('./services/cms');

module.exports = function mountCms(app, { db, APP_ROLE } = {}) {
  if (!app || !db) return;
  const cms = makeCmsService(db);
  if (!cms.enabled) return;

  function requireRole(roles) {
    return (req, res, next) => {
      const role = req.user && req.user.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ error: 'forbidden', detail: 'Insufficient role for content governance endpoint.' });
      }
      next();
    };
  }

  // GET /api/teacher/content — published content with provenance + deprecation flags.
  app.get('/api/teacher/content', requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const items = await db.listContentItems({ limit: 100 });
      const out = [];
      for (const it of items) {
        const prov = await cms.provenanceForItem({ contentItemId: it.id });
        const pv = prov.ok ? prov.publishedVersion : null;
        out.push({
          contentItemId: it.id,
          title: it.title,
          contentType: it.content_type,
          lifecycleStatus: it.lifecycle_status,
          publishedVersion: pv ? pv.semantic_version : null,
          locale: pv ? pv.locale : it.default_locale,
          deprecated: it.lifecycle_status === 'deprecated' || it.lifecycle_status === 'archived',
          eolDate: prov.ok && prov.deprecation ? prov.deprecation.eol_date : null,
        });
      }
      res.json({ items: out });
    } catch (e) { res.status(500).json({ error: 'content_list_failed' }); }
  });

  // GET /api/teacher/content/:itemId/provenance — full version history + approval rationale.
  app.get('/api/teacher/content/:itemId/provenance', requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const prov = await cms.provenanceForItem({ contentItemId: req.params.itemId });
      if (!prov.ok) return res.status(404).json({ error: prov.error });
      const versions = await db.listContentVersions({ contentItemId: req.params.itemId });
      const audit = await db.listContentAudit({ contentItemId: req.params.itemId, limit: 50 });
      res.json({
        item: { id: prov.item.id, title: prov.item.title, lifecycleStatus: prov.item.lifecycle_status, defaultLocale: prov.item.default_locale },
        publishedVersion: prov.publishedVersion,
        deprecation: prov.deprecation,
        versions: versions.map(v => ({ id: v.id, semanticVersion: v.semantic_version, locale: v.locale, branchType: v.branch_type, state: v.state, changeSummary: v.change_summary, publishedAt: v.published_at })),
        audit: audit.map(a => ({ eventType: a.event_type, actorRole: a.actor_role, rationale: a.rationale, at: a.event_timestamp })),
        transparency: 'Version history and approval rationale are recorded for every published change (AI Act Art. 13).',
      });
    } catch (e) { res.status(500).json({ error: 'provenance_failed' }); }
  });

  // GET /api/teacher/content/version/:versionId/lineage — lineage graph for one version.
  app.get('/api/teacher/content/version/:versionId/lineage', requireRole(['teacher', 'admin']), async (req, res) => {
    try {
      const r = await cms.lineage({ versionId: req.params.versionId });
      res.json(r);
    } catch (e) { res.status(500).json({ error: 'lineage_failed' }); }
  });
};
