"""Export the trained adaptive model to ONNX for in-browser inference.

Run:
    python ml/adaptive_model/export_onnx.py \
        --in ml/adaptive_model/learner_model.pt \
        --out ml/adaptive_model/learner_model.onnx
"""
from __future__ import annotations

import argparse
from pathlib import Path

import torch

from train_central import AdaptiveModel


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="inp", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    ckpt = torch.load(args.inp, map_location="cpu", weights_only=True)
    model = AdaptiveModel(ckpt["n_learners"], ckpt["n_items"])
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    learner = torch.tensor([0])
    item = torch.tensor([0])
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        (learner, item),
        args.out,
        input_names=["learner_idx", "item_idx"],
        output_names=["p_correct"],
        opset_version=17,
        dynamic_axes={"learner_idx": {0: "batch"}, "item_idx": {0: "batch"}, "p_correct": {0: "batch"}},
    )
    print(f"Wrote ONNX -> {args.out}")


if __name__ == "__main__":
    main()
