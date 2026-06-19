# Checklist — GDPR Art. 8 & Children's Data (Adaptive Learning, 007)

**Accountable:** GDPR Children's Data Specialist.

| Control | Implementation | Status |
|---------|----------------|--------|
| Lawful basis (Art. 8) | Adaptive learner routes sit behind the existing under-16 consent gate; no adaptive processing without active parental consent | [x] |
| Default consent age 16 | Inherited from platform; under-16 activation enqueues parent consent requests | [x] |
| Data minimisation | Only pseudonymous learner email + mastery evidence; no free-text PII stored in decisions | [x] |
| EU residency | West Europe Postgres; no cross-EU transfer | [x] |
| Purpose limitation | Adaptive records used only for path selection + teacher oversight evidence | [x] |
| Transparency to child | Age-appropriate fr/en labels; "your teacher decides" in non-adaptive mode | [x] |
| Human oversight | Teacher override + immutable evidence (Art. 14) | [x] |
| No profiling for ads | No behavioural advertising; no third-party sharing | [x] |
| No special-category data | No biometric/emotion/health inference | [x] |

## DPIA delta
New processing: storage of mastery-derived decisions, catch-up/stretch state,
override reasoning, and cross-device resume state for under-16 learners.
Risk is mitigated by: consent gate, pseudonymisation, EU residency, append-only
audit, teacher-in-the-loop, and non-adaptive fallback.

## Retention controls
Demo scope retains audit/override evidence for accountability. Production:
define retention window, support consent withdrawal (processing stops on
withdrawal — existing parent portal flow), and erasure of mutable
`adaptive_path_state` on account closure while preserving append-only audit as
legitimate-interest accountability records per the production DPIA.
