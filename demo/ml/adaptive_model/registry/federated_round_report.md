# Federated round report (synthetic, DP-aware)

- **Generated (UTC):** 2026-06-30T19:55:41+00:00
- **Clients (simulated devices):** 5
- **Rounds completed:** 8
- **DP epsilon spent:** 3.3058 (budget 4.0, delta 1e-05)
- **Final log-loss:** 0.5734  ·  **accuracy:** 0.716
- **Published version:** v1 (`fed-20260630-195541`) → `aml_model_registry.json`

## Convergence

| Round | Log-loss | Accuracy | Epsilon spent |
|---|---|---|---|
| 1 | 0.6871 | 0.552 | 0.4132 |
| 2 | 0.6477 | 0.659 | 0.8264 |
| 3 | 0.6016 | 0.691 | 1.2397 |
| 4 | 0.5961 | 0.672 | 1.6529 |
| 5 | 0.6193 | 0.654 | 2.0661 |
| 6 | 0.6006 | 0.676 | 2.4793 |
| 7 | 0.5804 | 0.688 | 2.8926 |
| 8 | 0.5734 | 0.716 | 3.3058 |

> Raw learner rows never leave their client shard; only clipped, DP-noised model deltas are aggregated (FedAvg). Production target: Flower on Confidential AKS (DCasv5) + Opacus DP-SGD, publishing to the real Azure ML model registry. See `federated_round.md`.
