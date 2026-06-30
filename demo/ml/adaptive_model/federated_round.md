# Federated round — synthetic DP-aware path (runnable) + production target

This stage trains the adaptive model with **federated learning** and publishes a
new model version. There are two paths:

## 1. Runnable synthetic path (no Azure) — `federated_round.py`

`federated_round.py` runs the full loop end-to-end on synthetic data with pure
NumPy (no Azure, AKS, Flower, or Opacus needed). It demonstrates criterion 5 of
[`../../DEPLOYMENT-REPORT.md`](../../DEPLOYMENT-REPORT.md) reproducibly:

```powershell
cd demo
python ml/adaptive_model/federated_round.py `
    --learners data/synthetic_learners.csv `
    --clients 5 --rounds 8 --epsilon-budget 4.0
```

What it does:
- Shards `synthetic_learners.csv` across K simulated on-device clients. **Raw
  learner rows never leave their shard** — only clipped, DP-noised model deltas
  are aggregated (FedAvg), mirroring the production design.
- Each client trains a tiny logistic model `P(correct) = sigmoid(w·x + b)`.
- The server FedAvg-aggregates and adds Gaussian DP noise (DP-SGD style) under a
  simple `(epsilon, delta)` accountant; the budget stays within **epsilon ≤ 4**.
- Publishes a new version to the mock AML registry `registry/aml_model_registry.json`
  with metrics + DP epsilon, writes the weights `.npz`, and emits
  `registry/federated_round_report.md`.

Latest run (committed under `registry/`): 5 clients · 8 rounds · log-loss
0.687 → 0.573 · accuracy 0.55 → 0.72 · **epsilon spent 3.31 (≤ 4)** · published
model **v1**.

## 2. Production target (out of scope for the offline demo)

The Day 6 stage of the tutorial deploys a Confidential AKS aggregator and runs a
Flower-based federated round with DP-SGD (Opacus, ε ≤ 4 budget), publishing to
the **real Azure ML model registry**:

- [`../../../plan/09-step-by-step-tutorial.md`](../../../plan/09-step-by-step-tutorial.md) — Day 6
- Reference: https://flower.ai/docs/framework/

Required pieces for the production path (TODO):
- `aggregator/` — Flower SuperLink + secure aggregation
- `client/` — synthetic-device simulator
- `dp/` — Opacus integration with privacy accountant
- AKS deployment manifest with Confidential VM nodepool (DCasv5)
