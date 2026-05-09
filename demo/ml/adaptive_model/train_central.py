"""Train a tiny adaptive learner model on synthetic data.

This is a *demo* trainer:
- Inputs: synthetic learner CSV + simple per-item correctness vectors.
- Output: a torch model that maps (learner_state, candidate_item) -> P(correct).
- DP is OFF in this script; see `federated_round.py` for DP-SGD via Opacus.

Run:
    python ml/adaptive_model/train_central.py \
        --learners data/synthetic_learners.csv \
        --out ml/adaptive_model/learner_model.pt
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

import torch
from torch import nn


class AdaptiveModel(nn.Module):
    def __init__(self, n_learners: int, n_items: int, dim: int = 16):
        super().__init__()
        self.l_emb = nn.Embedding(n_learners, dim)
        self.i_emb = nn.Embedding(n_items, dim)

    def forward(self, learner_idx: torch.Tensor, item_idx: torch.Tensor) -> torch.Tensor:
        z = (self.l_emb(learner_idx) * self.i_emb(item_idx)).sum(dim=-1)
        return torch.sigmoid(z)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--learners", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--items", type=int, default=20)
    p.add_argument("--epochs", type=int, default=5)
    args = p.parse_args()

    with open(args.learners, encoding="utf-8") as f:
        learners = list(csv.DictReader(f))

    n_learners = len(learners)
    n_items = args.items
    model = AdaptiveModel(n_learners, n_items)
    opt = torch.optim.Adam(model.parameters(), lr=1e-2)
    loss_fn = nn.BCELoss()

    # Demo synthetic interactions: each learner answers each item with P~ decile/10.
    for epoch in range(args.epochs):
        total = 0.0
        for li, learner in enumerate(learners):
            base_p = float(learner["decile"]) / 10.0
            for ii in range(n_items):
                y = torch.tensor([1.0 if (li + ii) % 10 < base_p * 10 else 0.0])
                yhat = model(torch.tensor([li]), torch.tensor([ii]))
                loss = loss_fn(yhat, y)
                opt.zero_grad()
                loss.backward()
                opt.step()
                total += loss.item()
        print(f"epoch {epoch} loss {total:.3f}")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "n_learners": n_learners, "n_items": n_items}, args.out)
    print(f"Saved {args.out}")


if __name__ == "__main__":
    main()
