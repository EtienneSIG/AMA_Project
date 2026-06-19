# Quickstart: Teacher Assessment and AI Rubric Governance

1. Confirm teacher-console and learner-web apps are running and connected to EU-hosted PostgreSQL.
2. Seed one class with at least 10 learners, one writing assignment, and one checkpoint quiz dataset.
3. Sign in as `teacher@learneu.demo` and create a rubric with 4 levels and 3 criteria.
4. Grade at least 5 submissions with rubric levels and qualitative comments; confirm comments pass Content Safety scan before commit.
5. Trigger AI generation with objective + grade band for:
   - one rubric draft,
   - one 5-question quiz draft.
6. Verify each generated artifact displays model version, safety verdict, and review controls (edit, reject, approve).
7. Reject one draft and approve one draft; confirm only the approved artifact can be linked to a learner assignment.
8. Publish one assessment to shared library, then sign in as a second teacher and copy it to another class.
9. Edit the copied assessment due date/content and verify the source shared artifact remains unchanged.
10. Open at-risk dashboard and verify mastery, completion, at-risk learner reasons, and ungraded count are present.
11. Create a remediation group from at-risk learners, assign a 3-step sequence, and verify learners are marked with catch-up path labels.
12. Submit reassessment results and confirm learners at or above threshold are marked remediation-cleared.
13. Review audit events and confirm traceability for generation, safety, decisions, publish, copy, remediation group, and clearance actions.

## Suggested verification calls

- `POST /api/teacher/assessments/rubrics`
- `POST /api/teacher/assessments/generate`
- `POST /api/teacher/assessments/generated/{artifactId}/decision`
- `POST /api/teacher/library/{sharedAssessmentId}/copy`
- `GET /api/teacher/analytics/at-risk?classId=<id>&topicId=<id>`
- `POST /api/teacher/remediation/groups`

## Success checks

- No generated artifact is assignable without an approval record.
- Content Safety covers generated drafts and teacher qualitative feedback.
- Shared-library copies are isolated while maintaining source lineage analytics.
- At-risk interventions remain teacher-initiated.
- Audit logs provide complete reconstruction of high-risk AI and intervention decisions.
