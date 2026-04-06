"""Append backend coverage summary to the GitHub Actions job summary."""

import json
import os
from pathlib import Path

COVERAGE_JSON = Path("backend/coverage.json")
SUMMARY_FILE = Path(os.environ["GITHUB_STEP_SUMMARY"])

if not COVERAGE_JSON.exists():
    SUMMARY_FILE.open("a", encoding="utf-8").write(
        "## Backend Coverage\n\nCoverage file was not generated.\n"
    )
    raise SystemExit(0)

data = json.loads(COVERAGE_JSON.read_text(encoding="utf-8"))
totals = data.get("totals", {})

percent = totals.get("percent_covered", 0)
covered = totals.get("covered_lines", 0)
missing = totals.get("missing_lines", 0)
statements = totals.get("num_statements", 0)

lines = [
    "## Backend Coverage",
    "",
    f"- Total: **{percent:.2f}%**",
    f"- Covered lines: {covered}",
    f"- Missing lines: {missing}",
    f"- Statements: {statements}",
    "",
]

SUMMARY_FILE.open("a", encoding="utf-8").write("\n".join(lines))
