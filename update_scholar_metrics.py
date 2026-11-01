#!/usr/bin/env python3
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


PROFILE_URL = "https://scholar.google.com/citations?hl=en&user=jpIFgToAAAAJ"
ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = ROOT / "scholar_metrics.js"
INDEX_PATH = ROOT / "index.html"


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


def update_page_metrics(metrics):
    page = INDEX_PATH.read_text(encoding="utf-8")
    for metric, ids in (
        ("citations", ("scholar-citations", "glance-citations")),
        ("hIndex", ("scholar-h-index", "glance-h-index")),
    ):
        for element_id in ids:
            pattern = rf'(id="{element_id}">)[^<]*(</span>)'
            page, count = re.subn(
                pattern,
                lambda match: match.group(1) + format(metrics[metric], ",") + match.group(2),
                page,
            )
            if count != 1:
                raise ValueError(f"Expected one metric element: {element_id}")
    INDEX_PATH.write_text(page, encoding="utf-8")


def main():
    for attempt in range(3):
        try:
            response = requests.get(
                PROFILE_URL,
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=30,
            )
            response.raise_for_status()
            metrics = parse_metric_rows(response.text)
            if not all(isinstance(metrics.get(key), int) and metrics[key] > 0
                       for key in ("citations", "hIndex")):
                raise ValueError("Could not find valid citation and h-index rows")
            break
        except (requests.RequestException, ValueError) as exc:
            print(f"Scholar refresh attempt {attempt + 1}/3 failed: {exc}", file=sys.stderr)
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
    else:
        print("::error::Scholar refresh failed; preserving the last verified metrics and timestamp.", file=sys.stderr)
        return 1

    update_page_metrics(metrics)
    write_metrics(metrics)
    print(f"Updated Scholar metrics: citations={metrics['citations']}, hIndex={metrics['hIndex']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
