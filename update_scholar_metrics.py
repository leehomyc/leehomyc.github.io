#!/usr/bin/env python3
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests


PROFILE_URL = "https://scholar.google.com/citations?hl=en&user=jpIFgToAAAAJ"
OUTPUT_PATH = Path("scholar_metrics.js")


def parse_metric_rows(html):
    metrics = {}
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.S):
        text = re.sub(r"<.*?>", " ", row)
        text = re.sub(r"\s+", " ", text).strip()

        citation_match = re.match(r"Citations\s+([0-9,]+)\s+", text)
        h_index_match = re.match(r"h-index\s+([0-9,]+)\s+", text)

        if citation_match:
            metrics["citations"] = int(citation_match.group(1).replace(",", ""))
        if h_index_match:
            metrics["hIndex"] = int(h_index_match.group(1).replace(",", ""))

    return metrics


def existing_metrics():
    if not OUTPUT_PATH.exists():
        return {"citations": 7575, "hIndex": 34}

    existing = OUTPUT_PATH.read_text(encoding="utf-8")
    citations = re.search(r"citations:\s*([0-9]+)", existing)
    h_index = re.search(r"hIndex:\s*([0-9]+)", existing)

    return {
        "citations": int(citations.group(1)) if citations else 7575,
        "hIndex": int(h_index.group(1)) if h_index else 34,
    }


def write_metrics(metrics):
    payload = {
        "citations": metrics["citations"],
        "hIndex": metrics["hIndex"],
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": "Google Scholar",
        "sourceUrl": PROFILE_URL,
    }
    lines = ["window.scholarMetrics = {"]
    for key, value in payload.items():
        encoded = json.dumps(value)
        comma = "," if key != "sourceUrl" else ""
        lines.append(f"  {key}: {encoded}{comma}")
    lines.append("};")
    OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    try:
        response = requests.get(
            PROFILE_URL,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=30,
        )
        response.raise_for_status()
        metrics = parse_metric_rows(response.text)

        if "citations" not in metrics or "hIndex" not in metrics:
            raise ValueError("Could not find citation and h-index rows")
    except Exception as exc:
        print(f"Warning: could not refresh Scholar metrics: {exc}")
        metrics = existing_metrics()

    write_metrics(metrics)
    print(f"Updated scholar_metrics.js: citations={metrics['citations']}, hIndex={metrics['hIndex']}")


if __name__ == "__main__":
    main()
