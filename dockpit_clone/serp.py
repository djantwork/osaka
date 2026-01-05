from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Iterable, List, Sequence
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


DUCKDUCKGO_HTML = "https://duckduckgo.com/html/"


@dataclass
class SerpResult:
    keyword: str
    title: str
    url: str
    snippet: str

    @property
    def domain(self) -> str:
        parsed = urlparse(self.url)
        return parsed.netloc or self.url


def fetch_serp(keyword: str, max_results: int = 10, pause: float = 1.0) -> List[SerpResult]:
    """
    Fetch organic SERP entries from DuckDuckGo's HTML results.
    """
    params = {"q": keyword}
    resp = requests.get(DUCKDUCKGO_HTML, params=params, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results: List[SerpResult] = []
    for a_tag in soup.select("a.result__a"):
        title = a_tag.get_text(strip=True)
        url = a_tag.get("href", "")
        snippet_tag = a_tag.find_parent("div", class_="result__body")
        snippet = ""
        if snippet_tag:
            snippet_text = snippet_tag.select_one(".result__snippet")
            if snippet_text:
                snippet = snippet_text.get_text(" ", strip=True)

        if title and url:
            results.append(SerpResult(keyword=keyword, title=title, url=url, snippet=snippet))
        if len(results) >= max_results:
            break

    # Be gentle with the provider
    if pause:
        time.sleep(pause)

    return results


def fetch_many(keywords: Sequence[str], max_results: int = 10, pause: float = 1.0) -> List[SerpResult]:
    aggregated: List[SerpResult] = []
    for kw in keywords:
        try:
            kw_results = fetch_serp(kw, max_results=max_results, pause=pause)
            aggregated.extend(kw_results)
            logger.info("Fetched %d results for '%s'", len(kw_results), kw)
        except requests.RequestException as exc:
            logger.error("Failed to fetch results for '%s': %s", kw, exc)
    return aggregated
