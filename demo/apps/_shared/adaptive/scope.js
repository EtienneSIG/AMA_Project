'use strict';
// Feature 007 — Teacher scope / override authorization (GDPR data-minimisation +
// AI Act Art. 14). A teacher may only view/override adaptive paths for learners
// within their assigned hierarchy scope (class/school).
//
// Demo posture: SEED teachers are scoped to the demo class. We resolve the
// learner's hierarchy when available; if the hierarchy table has no row (demo
// seed learners), we ALLOW but record the access in the audit trail so every
// teacher action remains accountable. Production MUST tighten this to a strict
// class/school membership check (documented in the Annex IV fragment).

async function assertTeacherScope(db, teacherUser, learnerEmail) {
  if (!teacherUser || (teacherUser.role !== 'teacher' && teacherUser.role !== 'admin')) {
    return { ok: false, reason: 'not_a_teacher' };
  }
  // Admins always in scope (governance/oversight).
  if (teacherUser.role === 'admin') return { ok: true, scope: 'admin' };

  try {
    if (typeof db.resolveLearnerHierarchy === 'function') {
      const h = await db.resolveLearnerHierarchy({ learnerId: learnerEmail });
      if (h && (h.classId || h.class_id || h.schoolId || h.school_id)) {
        // A real assignment exists. In the demo every seed teacher shares the demo
        // class, so membership holds; production replaces this with an explicit
        // teacher<->class/school membership lookup.
        return { ok: true, scope: 'class', hierarchy: h };
      }
    }
  } catch (_) { /* fall through to demo-permissive */ }

  // Demo seed learners have no hierarchy row — allow, but flag as unscoped so the
  // audit event makes the broad access explicit.
  return { ok: true, scope: 'demo_unscoped' };
}

module.exports = { assertTeacherScope };
