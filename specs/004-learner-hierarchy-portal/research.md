# Research Notes: Learner Data Hierarchy and Director Portal

## Decision 1: Keep the new portal as a separate app surface

- Decision: Add `demo/apps/director-portal/` rather than folding director views into an existing app.
- Rationale: Director access is a distinct role boundary with a distinct governance story. A separate surface keeps scope, routing, and release control explicit while reusing shared auth/session code.
- Alternatives considered: Extending `teacher-console` or `admin` with director-only routes. Rejected because it blurs role boundaries and makes the portal harder to govern and test independently.

## Decision 2: Keep learner hierarchy in the operational data layer

- Decision: Model class, school, and region hierarchy in the EU-hosted operational store and expose read-only rollup helpers/views to all consumer apps.
- Rationale: The feature needs stable historical reporting and exception handling for missing or conflicting assignments. That is easier to govern when the source hierarchy is centralized in the operational layer.
- Alternatives considered: Putting the hierarchy only in Fabric or only in the portal. Rejected because the hierarchy must also support learner and teacher reporting surfaces, not just the director portal.

## Decision 3: Treat Fabric / Power BI as the reporting backend, not the source of truth

- Decision: Use Fabric / Power BI embedded reporting for the analytics surface while keeping the learner hierarchy and audit trail in the demo app data layer.
- Rationale: The repository's target architecture already positions Fabric as the analytics and reporting layer, with Power BI embedded for aggregated reporting. The portal only needs controlled access to approved reports.
- Alternatives considered: Building a custom in-app dashboard only. Rejected because the feature explicitly requires embedded reports sourced from Fabric.

## Decision 4: Make the director portal read-only

- Decision: The portal will present aggregated reporting only and will not expose write paths for learner records or reporting outcomes.
- Rationale: This keeps the portal inside the constitution's teacher-in-the-loop and no autonomous learner-impacting decisions constraints.
- Alternatives considered: Adding portal-side edits for hierarchy or report annotations. Rejected because those actions belong in the operational admin/reviewer path.

## Decision 5: Audit everything that changes scope or report visibility

- Decision: Log portal access, report usage, and hierarchy changes with actor role, scope, timestamp, and outcome.
- Rationale: This supports the constitution's AI Act logging requirement and the spec's auditability goals.
- Alternatives considered: Logging only portal access. Rejected because hierarchy corrections and report usage are part of the compliance surface.