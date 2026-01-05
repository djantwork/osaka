from __future__ import annotations

from collections import defaultdict
from typing import Iterable, List

from .analysis import DomainSummary
from .serp import SerpResult


def build_report(results: Iterable[SerpResult], domain_summaries: List[DomainSummary]) -> str:
    results_by_keyword: dict[str, list[SerpResult]] = defaultdict(list)
    for res in results:
        results_by_keyword[res.keyword].append(res)

    lines: list[str] = []
    lines.append("# Dockpit-style competitor analysis")
    lines.append("")
    lines.append("## Competitor leaderboard")
    lines.append("")
    if not domain_summaries:
        lines.append("_No results available._")
    else:
        lines.append("| Rank | Domain | Hits | Keywords |")
        lines.append("| --- | --- | --- | --- |")
        for idx, summary in enumerate(domain_summaries, start=1):
            keywords = ", ".join(summary.keywords)
            lines.append(f"| {idx} | {summary.domain} | {summary.hits} | {keywords} |")
    lines.append("")

    lines.append("## Per-keyword SERP snapshots")
    lines.append("")
    if not results_by_keyword:
        lines.append("_No keywords processed._")
    else:
        for keyword, kw_results in results_by_keyword.items():
            lines.append(f"### {keyword}")
            if not kw_results:
                lines.append("_No results._")
                lines.append("")
                continue
            for idx, res in enumerate(kw_results, start=1):
                lines.append(f"{idx}. [{res.title}]({res.url})  ")
                if res.snippet:
                    lines.append(f"   {res.snippet}")
            lines.append("")

    return "\n".join(lines)
