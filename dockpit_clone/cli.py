from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Iterable, List

from .analysis import summarize_domains
from .report import build_report
from .serp import fetch_many


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Dockpit-style competitor analysis from public SERPs."
    )
    parser.add_argument(
        "--keywords",
        nargs="+",
        required=True,
        help="One or more keywords to analyze.",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=10,
        help="Maximum organic results to fetch per keyword (default: 10).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional output path for the Markdown report.",
    )
    parser.add_argument(
        "--pause",
        type=float,
        default=1.0,
        help="Seconds to pause between keyword fetches to reduce load (default: 1.0).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging.",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    results = fetch_many(args.keywords, max_results=args.max_results, pause=args.pause)
    domain_summaries = summarize_domains(results)
    report = build_report(results, domain_summaries)

    if args.output:
        args.output.write_text(report, encoding="utf-8")
        logging.info("Report written to %s", args.output)
    else:
        print(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
