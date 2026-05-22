# Load Test Report — `<YYYY-MM-DD>`

> Feature 011 — autoscale validation for the LearnEU demo. Fill this
> template from `demo/perf/runs/run-*.json` and the KQL output of
> `demo/observability/autoscale-events.kql`.

- **Run id**: `<run_id>` (from manifest)
- **Operation id**: `<operation_id>` (correlation with Log Analytics)
- **Target**: `<target_url>` (must NOT be a production slot — FR-008)
- **Generator**: PowerShell + System.Net.Http (decision logged in
  `demo/scripts/load-test.ps1` header)
- **Started / Ended (UTC)**: `<started_at>` → `<ended_at>`
- **Duration**: `<duration_minutes>` min
- **Concurrency**: `<target_concurrency>` virtual users
- **Seed**: `<seed>` (deterministic — FR-010)

## 1. Verdict

> **PASS / FAIL**: ⬜ (auto-derived by T021 logic)
>
> PASS iff at least one `1 → 2` scale-out event was recorded inside the
> sustained-CPU window. Otherwise FAIL with the Bicep rule reference
> `demo/infra/modules/app-service.bicep:61-135` and the observed CPU
> metric (T022).

## 2. Autoscale events (from `autoscale-events.kql`)

| TimeGenerated (UTC) | Action      | Status    | Old → New | Trigger summary |
|---------------------|-------------|-----------|-----------|-----------------|
| ⬜                   | scale-out   | Succeeded | 1 → 2     | CPU > 70 % over 5 min |
| ⬜                   | …           | …         | …         | … |

## 3. Generator metrics (from manifest)

| Metric | Value |
|--------|-------|
| Requests attempted | `<requests_attempted>` |
| Requests succeeded | `<requests_succeeded>` |
| Requests failed    | `<requests_failed>` |
| Throughput         | `<rps>` req/s |
| Latency p50        | `<p50>` ms |
| Latency p95        | `<p95>` ms |
| Latency p99        | `<p99>` ms |

## 4. Compliance posture

- **FR-008 production-slot refusal**: PASS — generator hard-refuses any
  target matching `prod|production|live|release`.
- **FR-010 deterministic seed**: PASS — same `seed` reproduces the same
  per-VU think-time sequence.
- **No PII**: PASS — generator emits only `GET /login.html` with a
  deterministic `User-Agent`.
- **Annex IV §"Operational resilience"** updated with the link to this
  report (T033).

## 5. Action items (if FAIL)

- [ ] Confirm the autoscale settings resource is deployed:
      `az resource list -g rg-learneu-demo --resource-type Microsoft.Insights/autoscalesettings`.
- [ ] Confirm the ASP SKU is Standard or Premium (autoscale not supported on B1).
- [ ] Confirm the CPU metric exceeded 70 % over 5 min in the Portal metrics blade.
- [ ] If CPU stayed below threshold: raise `-Concurrency` or extend `-DurationMinutes`.

## 6. Sign-off

- @demo-deployment-agent — execution
- @cross-agent-qa-verifier — verdict and rubric §11 evidence link
- @eu-ai-act-compliance-officer — Annex IV §"Operational resilience" update
