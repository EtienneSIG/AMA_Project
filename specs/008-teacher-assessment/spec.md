# Feature Specification: Teacher Assessment & Shared Library

**Feature Branch**: `008-teacher-assessment`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Backlog P0-P1 — Teacher authoring/assessment complet (rubrics/workflows); shared library + reaffectation/remediation complete; IA enseignant avancée (leveled generation + gouvernance).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Rubric-Based Assessment with Qualitative Feedback (Priority: P0)

A teacher creates a rubric for a writing assignment (4 levels: emerging, developing, proficient, advanced; criteria: organization, clarity, evidence). The teacher grades 15 student submissions using the rubric, providing qualitative feedback for each student. The system records each rubric score, teacher feedback, and flags any students who fall below "proficient" for follow-up.

**Why this priority**: Rubric-based grading is the foundation of formative assessment and directly enables differentiation. It must be efficient for teachers.

**Independent Test**: Teacher creates a 4-level rubric; assigns assignment; grades 5 submissions using the rubric (providing feedback); system displays grade summary and at-risk flags.

**Acceptance Scenarios**:

1. **Given** a teacher is authoring an assignment, **When** they select "Use rubric", **Then** they can choose from templates or create a custom rubric with 3–5 levels and 2–5 criteria per level.
2. **Given** an assignment is graded using a rubric, **When** a teacher scores a submission, **Then** the teacher selects a level for each criterion (or overall) and optionally adds qualitative comments; comments are scanned by Azure Content Safety before final submission.
3. **Given** a teacher completes grading, **When** they view the summary, **Then** the system displays a grade distribution, a list of at-risk students (those below a configurable threshold), and an export option (CSV/PDF).

---

### User Story 2 — Shared Library of Assessments & Reaffectation Workflow (Priority: P1)

Teachers across a school can browse and reuse rubrics, quizzes, and assignments from a shared library. When a teacher finds a relevant assessment, they click "Copy to My Class" and the assessment is added to their class materials. They can then customize it (edit questions, adjust due date, map to local curriculum standards) before assigning it.

**Why this priority**: A shared library reduces duplication and raises pedagogical quality. Reaffectation (assigning existing resources to a different cohort/year) is efficient and sustainable.

**Independent Test**: Teacher A creates a fraction quiz and marks it as "Shared (whole school)". Teacher B finds it in the library, copies it to their class, edits due date, and assigns it. Teacher A sees usage analytics showing Teacher B's copy.

**Acceptance Scenarios**:

1. **Given** a teacher completes an assessment, **When** they select "Share", **Then** the assessment is added to the school library with a title, description, and curriculum tags (grade, subject, skill, difficulty level).
2. **Given** a teacher browses the shared library, **When** they search by skill or view recent additions, **Then** they see assessments tagged with difficulty, number of prior uses, and average student performance.
3. **Given** a teacher copies an assessment from the library, **When** they customize it in their own class, **Then** the customization applies only to their copy; the original library item is unchanged. The system tracks usage (number of copies, number of uses).

---

### User Story 3 — Remediation & Grouping Workflow (Priority: P1)

After a checkpoint quiz, the teacher reviews at-risk students (mastery <70%). The teacher can group these learners and assign a specific remediation sequence: reteaching video + guided practice + reassessment. The system tracks each learner's progress through remediation and flags when reassessment shows ≥70% mastery.

**Why this priority**: Systematic remediation closes the learning-loss gap. Teachers need efficient grouping and tracking to manage differentiation at scale.

**Independent Test**: After quiz, teacher creates a group for 8 at-risk students, assigns a 3-step remediation sequence; system tracks each student's progress and alerts teacher when each reassesses above 70%.

**Acceptance Scenarios**:

1. **Given** a quiz is graded and at-risk students are identified, **When** a teacher selects "Create remediation group", **Then** the system offers a quick-select for at-risk thresholds and allows the teacher to manually add/remove learners from the group.
2. **Given** a remediation group is formed, **When** the teacher assigns a remediation sequence (reteaching + practice + reassess), **Then** the system sends targeted assignments to the group, and each learner sees a "Catch-up Path" label in their assignment list.
3. **Given** a learner completes remediation reassessment, **When** the score is ≥70%, **Then** the system flags the learner as "remediation cleared" and notifies the teacher; learner can transition to the next topic.

---

### User Story 4 — AI-Assisted Question & Rubric Generation (Priority: P2)

A teacher has a learning objective ("Learners can apply fractions to real-world scenarios") and limited time to author. The teacher enters the objective and selects a level (grade 4–5) and output format (quiz 5 questions, or rubric 4 levels). The system uses Azure OpenAI to generate a draft set of questions or rubric. The teacher reviews, edits, and approves before using in the classroom.

**Why this priority**: AI-assisted generation can reduce teacher authoring time by 50%; teacher retains final say per EU AI Act Art. 14.

**Independent Test**: Teacher enters objective + level; system generates 5 draft quiz questions; teacher edits 2 questions, approves, and assigns; system logs the AI version and teacher edits for audit.

**Acceptance Scenarios**:

1. **Given** a teacher selects "Generate with AI", **When** they provide learning objective, level, and count (e.g., "5 questions"), **Then** the system calls Azure OpenAI with a pedagogically-grounded prompt and returns a set of draft items.
2. **Given** draft items are generated, **When** the teacher reviews them, **Then** each item displays: (a) the item text, (b) a "flag as weak" button, (c) an edit button, and (d) a "Approve" button.
3. **Given** a teacher approves a generated item, **When** it is used in the classroom, **Then** the system logs: AI model version, prompt, generated text, teacher edits (if any), and approval timestamp for audit.
4. **Given** generated content is used, **When** teacher reviews student responses, **Then** teacher can provide feedback indicating the item was weak or needs refinement; system logs feedback for model improvement (privacy-preserving aggregate data only).

---

### User Story 5 — Assessment Analytics & At-Risk Dashboard (Priority: P0)

A teacher views their class analytics dashboard. The dashboard shows: overall class mastery (% by topic), completion rate by assignment, a sorted list of at-risk students (flagged by low mastery or incomplete work), and a suggested intervention (e.g., "3 students in Math need catch-up; consider forming a group").

**Why this priority**: Teachers need data-informed intervention guidance. Real-time at-risk flags reduce time spent diagnosing and enable proactive support.

**Independent Test**: Teacher opens class analytics; sees overall mastery (65% in fractions), 4 at-risk students listed, and a prompt "Recommend remediation group for at-risk students".

**Acceptance Scenarios**:

1. **Given** a teacher opens the class analytics dashboard, **When** the dashboard loads, **Then** it displays: (a) overall class mastery by topic (pie/bar chart), (b) completion rate by assignment (progress bars), (c) a sortable list of at-risk students (name, mastery %, reason flagged), and (d) a count of ungraded submissions.
2. **Given** at-risk students are displayed, **When** the teacher clicks on a student, **Then** the system shows that learner's detail: recent activity, mastery by topic, and recommended next steps (catch-up, reassign, parent contact).

### Edge Cases

- Teacher generates an AI item that contains biased or pedagogically unsound content; system flags for review before use.
- Shared assessment is updated by original teacher; copies in other classes are marked as "new version available" but not automatically updated.
- Rubric contains a criterion that maps to EU AI Act high-risk decision (e.g., "Potential for bias in scoring"); system flags for teacher review.
- Student submits assessment via multiple devices (laptop, tablet); system deduplicates and records single submission with metadata about devices used.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Teacher MUST be able to create and use custom rubrics with 3–5 levels and 2–5 criteria per level; rubric scores MUST be recorded in learner progress.
- **FR-002**: System MUST provide a shared library (searchable, tagged, filterable by grade/subject/skill) where teachers can browse, copy, and reuse assessments.
- **FR-003**: Copied assessments MUST support quick customization (due date, questions, rubric levels) before assignment; customizations apply only to the copy.
- **FR-004**: System MUST identify at-risk students (mastery <70% or incomplete work) and allow teachers to group them for targeted remediation.
- **FR-005**: Remediation workflow MUST allow assignment of a multi-step sequence (reteach + practice + reassess) to a group; system tracks completion and reassessment scores.
- **FR-006**: Teacher MUST be able to trigger AI-assisted generation of questions or rubrics; draft output MUST be reviewed and approved by teacher before classroom use.
- **FR-007**: All AI-generated content MUST be logged with model version, prompt, teacher edits, and approval timestamp for audit.
- **FR-008**: Teacher analytics MUST display class mastery by topic, completion rates, at-risk student list, and recommended interventions.
- **FR-009**: Assessment content MUST be scanned by Azure Content Safety for compliance; teacher MUST review flagged content before use or student delivery.
- **FR-010**: Feature MUST preserve EU residency, teacher autonomy (no autonomous grading), and GDPR Art. 8 compliance.

### Key Entities

- **Rubric**: Assessment rubric (name, levels 0–5, criteria, weights, creator teacher, shared flag).
- **RubricScore**: Teacher score using rubric (learner, assessment, rubric, level per criterion, teacher feedback, timestamp).
- **SharedAssessment**: Assessment marked for school-wide reuse (original assessment ID, library visibility, usage count, average performance).
- **RemediationGroup**: Teacher-created group for targeted support (learners, remediation sequence, progress tracking, reassessment scores).
- **AIGeneratedItem**: Item or rubric generated by Azure OpenAI (prompt, model version, generated text, teacher edits, approval status, classroom usage).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rubric creation and first grading takes teacher ≤**10 minutes** (including review of system-provided templates).
- **SC-002**: **≥50%** of teachers use the shared library within **6 months** of launch.
- **SC-003**: Shared assessments achieve **≥20% reuse rate** (proportion of copies to original uses).
- **SC-004**: **≥80%** of remediation groups show measurable improvement (≥15 percentage points mastery gain) by reassessment.
- **SC-005**: AI-assisted generation reduces teacher item-authoring time by **≥40%** (measured by time from objective to approved item).
- **SC-006**: **100%** of AI-generated items are teacher-reviewed before use; zero items bypass teacher approval.
- **SC-007**: Compliance review confirms **zero** autonomous grading and **zero** circumvention of teacher oversight in assessment workflow.

## Assumptions

- Teachers have sufficient time to review AI-generated content and provide feedback.
- Shared library governance (quality review, curriculum alignment) is handled by school leadership or curriculum lead role.
- Content Safety API is available and configured for assessment content scanning.

## Constitution Check

| Principle | How this spec complies |
|---|---|
| I. EU-Resident, Data-Minimised | Assessment data and rubric scores are stored in EU only; no profiling, no cross-learner ranking published without consent. |
| II. GDPR Art. 8 | Assessments are transparent to parents; teacher overrides are logged; no autonomous grading. |
| III. EU AI Act high-risk | AI-generated content is flagged as high-risk; teacher review and approval required before use; full audit trail maintained. |
| IV. Teacher-in-the-loop | Teachers author, review, customize, and approve all assessments and rubrics. AI is assistive only. |
| V. Pedagogical sign-off | Assessment rubrics and remediation sequences reviewed by Learning Sciences specialist for pedagogical soundness. |
| VI. Outcome-contract driven | SC-004 supports outcome-gap reduction via systematic remediation; SC-001 supports teacher admin time reduction. |
| VII. Reproducible, spec-driven | Includes runbook in quickstart: rubric creation → grading → at-risk identification → remediation workflow. |
