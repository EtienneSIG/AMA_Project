# Federated round — STUB

This file is intentionally a placeholder. The Day 6 stage of the tutorial
deploys a Confidential AKS aggregator and runs a Flower-based federated
round with DP-SGD (Opacus, ε ≤ 4 budget).

For the **scaffold-only** path, this is not implemented. See:
- [`../../plan/09-step-by-step-tutorial.md`](../../plan/09-step-by-step-tutorial.md) — Day 6
- Reference: https://flower.ai/docs/framework/

Required pieces (TODO):
- `aggregator/` — Flower SuperLink + secure aggregation
- `client/` — synthetic-device simulator
- `dp/` — Opacus integration with privacy accountant
- AKS deployment manifest with Confidential VM nodepool (DCasv5)
