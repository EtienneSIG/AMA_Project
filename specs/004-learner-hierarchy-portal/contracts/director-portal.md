# Director Portal Contract

## Purpose

Define the interface boundary for the new director portal app surface and its embedded Fabric / Power BI reports.

## Required behaviors

- The portal must require a director role before any report content is shown.
- The portal must honor school and region scope claims when choosing which reports and filters are available.
- The portal must default to aggregated views and must not surface direct learner identifiers unless an approved role already has that lawful basis.
- The portal must show a safe no-access state when authorization fails.
- The portal must emit audit events for portal access, report usage, and hierarchy-related scope changes.

## Embedded report metadata

- report_id
- workspace_id
- dataset_id or equivalent semantic-model reference
- allowed scope dimensions
- aggregation level
- sensitivity label

## Scope contract

- A director may only see the schools and regions in the granted scope snapshot.
- Scope changes must take effect on the next authorized session and be recorded in the audit trail.
- Report rendering must fail closed when report metadata or scope metadata is missing.