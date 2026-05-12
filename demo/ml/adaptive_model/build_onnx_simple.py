"""Generate a tiny adaptive learner ONNX model with NumPy + onnx (no torch).

Model contract (used by learner-web/public/js/adaptive.js):
  Inputs:
    learner   float32[1, 4]   = [decile/10, sen, prior_correct, prior_attempts/20]
    item      float32[1, 3]   = [difficulty, topic_id_norm, is_review]
  Output:
    p_correct float32[1, 1]   = sigmoid(W_l @ learner + W_i @ item + b)

This is intentionally simple so the model can be regenerated deterministically without
training data. The point is to exercise the full client-side ONNX inference path so the
learner-web app makes a real personalisation decision before the user sees an item.

Usage:
    python ml/adaptive_model/build_onnx_simple.py --out apps/learner-web/public/models/learner.onnx
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper


def _const(name: str, arr: np.ndarray) -> onnx.TensorProto:
    return numpy_helper.from_array(arr.astype(np.float32), name=name)


def build_model() -> onnx.ModelProto:
    rng = np.random.default_rng(42)

    # Learner features: [decile/10, sen, prior_correct, prior_attempts/20]  (1, 4)
    # Item features:    [difficulty, topic_id_norm, is_review]               (1, 3)
    # Hidden weights — handcrafted for plausible behaviour:
    #   higher decile → easier items predicted correct
    #   sen flag → slight downweight
    #   higher prior_correct → upweight
    #   item difficulty → strongly negative
    w_l = np.array([[0.8], [-0.4], [1.5], [0.2]], dtype=np.float32)  # (4,1)
    w_i = np.array([[-1.6], [0.0], [0.3]], dtype=np.float32)         # (3,1)
    b   = np.array([[0.2]], dtype=np.float32)                        # (1,1)

    # Add a touch of noise so the model isn't strictly linear-separable.
    w_l += rng.normal(0, 0.05, size=w_l.shape).astype(np.float32)
    w_i += rng.normal(0, 0.05, size=w_i.shape).astype(np.float32)

    learner = helper.make_tensor_value_info('learner', TensorProto.FLOAT, [1, 4])
    item    = helper.make_tensor_value_info('item',    TensorProto.FLOAT, [1, 3])
    p_out   = helper.make_tensor_value_info('p_correct', TensorProto.FLOAT, [1, 1])

    init_w_l = _const('W_learner', w_l)
    init_w_i = _const('W_item', w_i)
    init_b   = _const('bias', b)

    nodes = [
        helper.make_node('MatMul', ['learner', 'W_learner'], ['z_l']),
        helper.make_node('MatMul', ['item', 'W_item'],       ['z_i']),
        helper.make_node('Add',    ['z_l', 'z_i'],           ['z_li']),
        helper.make_node('Add',    ['z_li', 'bias'],         ['logit']),
        helper.make_node('Sigmoid',['logit'],                ['p_correct']),
    ]
    graph = helper.make_graph(
        nodes,
        name='LearnEUAdaptive',
        inputs=[learner, item],
        outputs=[p_out],
        initializer=[init_w_l, init_w_i, init_b],
    )
    model = helper.make_model(
        graph,
        producer_name='learneu-demo',
        opset_imports=[helper.make_opsetid('', 17)],
    )
    model.ir_version = 9
    onnx.checker.check_model(model)
    return model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    model = build_model()
    onnx.save(model, str(out_path))
    size = os.path.getsize(out_path)
    print(f'wrote {out_path} ({size} bytes)')


if __name__ == '__main__':
    main()
