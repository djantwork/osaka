from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List

from .serp import SerpResult


@dataclass
class DomainSummary:
    domain: str
    hits: int
    keywords: List[str]


def summarize_domains(results: Iterable[SerpResult]) -> List[DomainSummary]:
    domain_hits: Counter[str] = Counter()
    domain_keywords: Dict[str, set[str]] = defaultdict(set)

    for result in results:
        domain = result.domain
        domain_hits[domain] += 1
        domain_keywords[domain].add(result.keyword)

    summaries = [
        DomainSummary(domain=domain, hits=count, keywords=sorted(domain_keywords[domain]))
        for domain, count in domain_hits.most_common()
    ]
    return summaries
