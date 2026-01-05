## Dockpit-style competitor analysis CLI

This repository contains a lightweight Python CLI that emulates the core workflow of the **Dockpit** competitor-analysis dashboard. It collects live search results, identifies which domains dominate specific keywords, and produces a shareable Markdown report.

### Features

- Pulls organic results from DuckDuckGo for one or more keywords
- Extracts domains and aggregates their visibility across all keywords
- Generates a Markdown report with per-keyword results and a global competitor leaderboard
- Outputs to stdout or a file for easy sharing

### Quick start

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Run the CLI for one or more keywords:

```bash
python -m dockpit_clone --keywords "プロジェクト管理ツール" "SEO 競合分析" --max-results 15 --output report.md
```

3. Open `report.md` to review the competitor leaderboard and detailed SERP hits.

### CLI options

```
python -m dockpit_clone --keywords <kw1> [<kw2> ...] [--max-results 10] [--output report.md]
```

- `--keywords`: One or more target keywords (required)
- `--max-results`: How many organic results to fetch per keyword (default: 10)
- `--output`: Write the Markdown report to a file instead of stdout

### Notes

- The tool queries DuckDuckGo's HTML results to avoid API keys. Be mindful of rate limits and avoid aggressive scraping.
- If a keyword yields no results, the report will mark it accordingly.
