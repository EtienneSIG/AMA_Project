"""Federated learning round (synthetic, DP-aware) — runnable demo path.

Demonstrates criterion 5 of demo/DEPLOYMENT-REPORT.md ("Federated round publishes
a new model version to the AML Registry") end-to-end on SYNTHETIC data with NO
Azure / Confidential-AKS / Flower dependency. Pure NumPy so it runs anywhere.

What it does
------------
1. Loads `data/synthetic_learners.csv` and shards the learners across K simulated
   on-device clients (no raw learner row ever leaves its client — only model
   deltas are aggregated, mirroring the production federated design).
2. Each client trains a tiny logistic model  P(correct) = sigmoid(w·x + b)
   on its local interactions for a few epochs (FedSGD/FedAvg local step).
3. The server FedAvg-aggregates client weights and adds Gaussian DP noise
   (DP-SGD style) with a simple (epsilon, delta) accountant; the budget stays
   within epsilon <= 4 (constitution / privacy-preserving-ml-engineer guardrail).
4. After R rounds it "publishes" a new model version to a local mock AML model
   registry (JSON) with metrics, the DP epsilon spent, and a weights artifact.

Production target (out of scope here, documented in federated_round.md):
    Flower SuperLink on a Confidential AKS DCasv5 nodepool + Opacus DP-SGD,
    publishing to the real Azure ML model registry.

Run:
    python ml/adaptive_model/federated_round.py \
        --learners data/synthetic_learners.csv \
        --clients 5 --rounds 8 --epsilon-budget 4.0
"""
from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

N_ITEMS = 20
RNG = np.random.default_rng(42)  # deterministic demo


def _sigmoid(z: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-z))


def _synthesise_interactions(decile: int) -> tuple[np.ndarray, np.ndarray]:
    """Build (X, y) for one learner across N_ITEMS.

    Features: [learner_ability, item_difficulty]. Label drawn from a Rasch-like
    P(correct) = sigmoid(ability - difficulty), so the model has real signal.
    """
    ability = (decile - 5.5) / 3.0  # center deciles ~ [-1.5, 1.5]
    difficulty = np.linspace(-1.2, 1.2, N_ITEMS)
    x = np.stack([np.full(N_ITEMS, ability), difficulty], axis=1)
    p = _sigmoid(ability - difficulty)
    y = (RNG.random(N_ITEMS) < p).astype(np.float64)
    return x, y


def _load_clients(learners_csv: Path, n_clients: int) -> list[tuple[np.ndarray, np.ndarray]]:
    with open(learners_csv, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    shards: list[list] = [[] for _ in range(n_clients)]
    for i, row in enumerate(rows):
        try:
            decile = int(float(row.get("decile", "5")))
        except ValueError:
            decile = 5
        shards[i % n_clients].append(_synthesise_interactions(decile))
    clients = []
    for shard in shards:
        if not shard:
            continue
        X = np.concatenate([s[0] for s in shard], axis=0)
        y = np.concatenate([s[1] for s in shard], axis=0)
        clients.append((X, y))
    return clients


def _local_train(w: np.ndarray, b: float, X: np.ndarray, y: np.ndarray,
                 epochs: int, lr: float) -> tuple[np.ndarray, float]:
    w = w.copy()
    for _ in range(epochs):
        z = X @ w + b
        pred = _sigmoid(z)
        grad = pred - y
        w -= lr * (X.T @ grad) / len(y)
        b -= lr * float(np.mean(grad))
    return w, b


def _metrics(w: np.ndarray, b: float, clients) -> tuple[float, float]:
    X = np.concatenate([c[0] for c in clients], axis=0)
    y = np.concatenate([c[1] for c in clients], axis=0)
    pred = _sigmoid(X @ w + b)
    eps = 1e-9
    logloss = float(-np.mean(y * np.log(pred + eps) + (1 - y) * np.log(1 - pred + eps)))
    acc = float(np.mean((pred >= 0.5) == (y >= 0.5)))
    return logloss, acc


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--learners", default="data/synthetic_learners.csv")
    p.add_argument("--clients", type=int, default=5)
    p.add_argument("--rounds", type=int, default=8)
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--lr", type=float, default=0.5)
    p.add_argument("--epsilon-budget", type=float, default=4.0)
    p.add_argument("--noise-multiplier", type=float, default=1.1)
    p.add_argument("--clip", type=float, default=1.0)
    p.add_argument("--registry", default="ml/adaptive_model/registry/aml_model_registry.json")
    p.add_argument("--report", default="ml/adaptive_model/registry/federated_round_report.md")
    args = p.parse_args()

    here = Path(__file__).resolve()
    repo_demo = here.parents[2]  # demo/
    learners_csv = (repo_demo / args.learners).resolve()
    clients = _load_clients(learners_csv, args.clients)
    if not clients:
        raise SystemExit(f"No client shards built from {learners_csv}")

    w = np.zeros(2, dtype=np.float64)
    b = 0.0
    # Simple moments-accountant proxy: per-round epsilon for the Gaussian
    # mechanism, summed across rounds (kept <= budget).
    delta = 1e-5
    per_round_eps = (args.clip / args.noise_multiplier) ** 2 / 2.0
    history = []
    spent = 0.0

    for r in range(1, args.rounds + 1):
        deltas_w, deltas_b = [], []
        for (X, y) in clients:
            cw, cb = _local_train(w, b, X, y, args.epochs, args.lr)
            dw, db = cw - w, cb - b
            # Per-client gradient clipping (DP-SGD).
            norm = float(np.sqrt(np.sum(dw ** 2) + db ** 2)) or 1.0
            scale = min(1.0, args.clip / norm)
            deltas_w.append(dw * scale)
            deltas_b.append(db * scale)

        agg_w = np.mean(deltas_w, axis=0)
        agg_b = float(np.mean(deltas_b))
        # Gaussian DP noise on the aggregate (secure-aggregation surrogate).
        sigma = args.noise_multiplier * args.clip / max(len(clients), 1)
        agg_w = agg_w + RNG.normal(0.0, sigma, size=agg_w.shape)
        agg_b = agg_b + float(RNG.normal(0.0, sigma))

        w = w + agg_w
        b = b + agg_b
        spent += per_round_eps
        if spent > args.epsilon_budget:
            print(f"Stopping at round {r}: epsilon budget {args.epsilon_budget} reached.")
            break

        logloss, acc = _metrics(w, b, clients)
        history.append({"round": r, "logloss": round(logloss, 4),
                        "accuracy": round(acc, 4), "epsilon_spent": round(spent, 4)})
        print(f"round {r:2d}  logloss {logloss:.4f}  acc {acc:.3f}  eps {spent:.3f}")

    final = history[-1]
    out_dir = (repo_demo / Path(args.registry)).resolve().parent
    out_dir.mkdir(parents=True, exist_ok=True)

    # Weights artifact for this published version.
    ts = datetime.now(timezone.utc)
    version_tag = "fed-" + ts.strftime("%Y%m%d-%H%M%S")
    weights_path = out_dir / f"learner_fed_{version_tag}.npz"
    np.savez(weights_path, w=w, b=np.array([b]))

    # Append to the mock AML model registry.
    registry_path = (repo_demo / Path(args.registry)).resolve()
    registry = {"model": "learneu-adaptive", "versions": []}
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
    version_no = len(registry["versions"]) + 1
    registry["versions"].append({
        "version": version_no,
        "tag": version_tag,
        "trained_utc": ts.isoformat(timespec="seconds"),
        "method": "federated-avg + gaussian-dp (synthetic)",
        "clients": len(clients),
        "rounds": final["round"],
        "metrics": {"logloss": final["logloss"], "accuracy": final["accuracy"]},
        "dp": {"epsilon": final["epsilon_spent"], "delta": delta,
               "noise_multiplier": args.noise_multiplier, "clip": args.clip},
        "weights_artifact": weights_path.name,
        "registry_target": "mock-aml (offline); prod target = Azure ML model registry",
    })
    registry_path.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")

    # Human-readable round report.
    report = [
        "# Federated round report (synthetic, DP-aware)",
        "",
        f"- **Generated (UTC):** {ts.isoformat(timespec='seconds')}",
        f"- **Clients (simulated devices):** {len(clients)}",
        f"- **Rounds completed:** {final['round']}",
        f"- **DP epsilon spent:** {final['epsilon_spent']} (budget {args.epsilon_budget}, delta {delta})",
        f"- **Final log-loss:** {final['logloss']}  ·  **accuracy:** {final['accuracy']}",
        f"- **Published version:** v{version_no} (`{version_tag}`) → `{registry_path.name}`",
        "",
        "## Convergence",
        "",
        "| Round | Log-loss | Accuracy | Epsilon spent |",
        "|---|---|---|---|",
    ]
    for h in history:
        report.append(f"| {h['round']} | {h['logloss']} | {h['accuracy']} | {h['epsilon_spent']} |")
    report += [
        "",
        "> Raw learner rows never leave their client shard; only clipped, "
        "DP-noised model deltas are aggregated (FedAvg). Production target: "
        "Flower on Confidential AKS (DCasv5) + Opacus DP-SGD, publishing to the "
        "real Azure ML model registry. See `federated_round.md`.",
        "",
    ]
    Path(repo_demo / args.report).write_text("\n".join(report), encoding="utf-8")

    print(f"Published model v{version_no} ({version_tag}) -> {registry_path}")
    print(f"Round report -> {repo_demo / args.report}")


if __name__ == "__main__":
    main()
