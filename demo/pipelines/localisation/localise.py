"""Localise one Math unit NL -> DE using Azure OpenAI gpt-5.4-nano + Content Safety.

This is the demo path described in plan/08-demo-on-azure.md (Step 2).
It runs against the deployed Azure resources read from .env.local.

Run:
    python pipelines/localisation/localise.py \
        --in data/math_unit_fractions.md \
        --target de-DE \
        --out data/localised/de-DE/math_unit_fractions.md

Required env (loaded automatically from demo/.env.local if present):
    AZURE_OPENAI_ENDPOINT
    AZURE_OPENAI_DEPLOYMENT  (default: gpt-5.4-nano)
    AZURE_CONTENT_SAFETY_ENDPOINT
    AZURE_TENANT_ID
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def _load_env(env_file: Path) -> None:
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def localise(source_md: str, glossary_csv: str, target_lang: str) -> str:
    """Call Azure OpenAI gpt-5.4-nano (reasoning) with country-specific prompt + glossary."""
    try:
        from openai import AzureOpenAI  # type: ignore
        from azure.identity import DefaultAzureCredential, get_bearer_token_provider  # type: ignore
    except ImportError:
        print("ERROR: pip install openai azure-identity", file=sys.stderr)
        raise

    endpoint = os.environ["AZURE_OPENAI_ENDPOINT"]
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-5.4-nano")
    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    client = AzureOpenAI(
        azure_endpoint=endpoint,
        azure_ad_token_provider=token_provider,
        api_version="2024-08-01-preview",
    )

    system = (
        f"You are a localisation editor for K-12 math content. "
        f"Translate from nl-NL to {target_lang}. Preserve markdown structure, "
        f"front-matter, and pedagogical intent. Use the glossary verbatim."
    )
    user = f"Glossary (CSV):\n{glossary_csv}\n\n---\nSource:\n{source_md}"
    resp = client.chat.completions.create(
        model=deployment,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.2,
    )
    return resp.choices[0].message.content or ""


def content_safety_check(text: str) -> dict:
    """Gate generated output through Azure AI Content Safety."""
    try:
        from azure.ai.contentsafety import ContentSafetyClient  # type: ignore
        from azure.ai.contentsafety.models import AnalyzeTextOptions  # type: ignore
        from azure.identity import DefaultAzureCredential  # type: ignore
    except ImportError:
        print("ERROR: pip install azure-ai-contentsafety azure-identity", file=sys.stderr)
        raise

    endpoint = os.environ["AZURE_CONTENT_SAFETY_ENDPOINT"]
    client = ContentSafetyClient(endpoint, DefaultAzureCredential())
    result = client.analyze_text(AnalyzeTextOptions(text=text))
    verdict = {c.category: c.severity for c in result.categories_analysis}
    return {"verdict": verdict, "blocked": any(s >= 4 for s in verdict.values())}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="inp", required=True)
    p.add_argument("--target", default="de-DE")
    p.add_argument("--glossary", default="data/glossaries/math-de-DE.csv")
    p.add_argument("--out", required=True)
    args = p.parse_args()

    here = Path(__file__).resolve()
    _load_env(here.parents[2] / ".env.local")

    source = Path(args.inp).read_text(encoding="utf-8")
    glossary = Path(args.glossary).read_text(encoding="utf-8")

    localised = localise(source, glossary, args.target)
    safety = content_safety_check(localised)
    if safety["blocked"]:
        print(f"BLOCKED by Content Safety: {safety['verdict']}", file=sys.stderr)
        sys.exit(2)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(localised, encoding="utf-8")
    print(f"Localised -> {out}  (safety verdict: {safety['verdict']})")


if __name__ == "__main__":
    main()
