"""Generate API wiki markdown end-to-end for this repository.

Flow:
1) Run drf-spectacular to generate backend/schema.yml.
2) Run Widdershins to generate backend/api_wiki.md.
3) Rewrite markdown headings and add a Table of Contents.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

METHOD_PATTERN = re.compile(r"^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+.+$")
METHOD_LINE_PATTERN = re.compile(r"^`(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+([^`]+)`$")
H2_PATTERN = re.compile(r"^##\s+(.+)$")
SECTION_PATTERN = re.compile(r'^<h1 id="([^"]+)">([^<]+)</h1>$')
ANCHOR_PATTERN = re.compile(r'^<a id="([^"]+)"></a>$')

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
SCHEMA_FILE = BACKEND_DIR / "schema.yml"
API_WIKI_FILE = BACKEND_DIR / "api_wiki.md"
ROOT_DOC_SECTION_ID = "neighborship-app-api"


def run_command(command: list[str], cwd: Path) -> None:
    """Run a command and raise when it fails."""
    print(f"Running: {' '.join(command)}")
    subprocess.run(command, cwd=cwd, check=True)


def resolve_widdershins_command() -> list[str]:
    """Return the Widdershins command prefix."""
    if shutil.which("widdershins"):
        return ["widdershins"]
    if shutil.which("npx"):
        return ["npx", "widdershins"]
    raise FileNotFoundError("Widdershins not found. Install with 'npm install -g widdershins'.")


def extract_h2_heading(line: str) -> str | None:
    """Extract heading text from an H2 line."""
    match = H2_PATTERN.match(line)
    return match.group(1).strip() if match else None


def parse_section_header(line: str) -> tuple[str, str] | None:
    """Parse HTML h1 section line and return (id, name)."""
    match = SECTION_PATTERN.match(line)
    if not match:
        return None
    return match.group(1), match.group(2).strip()


def is_method_heading(heading: str) -> bool:
    """Return True if heading starts with an HTTP method."""
    return METHOD_PATTERN.match(heading) is not None


def find_method_line_after(lines: list[str], start: int) -> str | None:
    """Find backticked METHOD /path after an endpoint heading."""
    for index in range(start + 1, min(start + 10, len(lines))):
        match = METHOD_LINE_PATTERN.match(lines[index].strip())
        if match:
            return f"{match.group(1)} {match.group(2).strip()}"
    return None


def find_anchor_after(lines: list[str], start: int) -> tuple[int, str] | None:
    """Find next anchor line index and anchor id after a heading."""
    for index in range(start + 1, min(start + 10, len(lines))):
        match = ANCHOR_PATTERN.match(lines[index].strip())
        if match:
            return index, match.group(1)
    return None


def find_next_non_empty_index(lines: list[str], start: int) -> int | None:
    """Return the first non-empty line index at or after start."""
    index = start
    while index < len(lines) and lines[index].strip() == "":
        index += 1
    if index >= len(lines):
        return None
    return index


def cleanup_extra_blank_line(lines: list[str], index: int) -> None:
    """Remove a blank line when deletion creates two consecutive empty lines."""
    if index >= len(lines) or index - 1 < 0:
        return
    if lines[index].strip() == "" and lines[index - 1].strip() == "":
        del lines[index]


def remove_duplicate_inline_after_heading(
    lines: list[str], heading_index: int, heading: str
) -> None:
    """Remove backticked duplicate endpoint line under a heading if present."""
    anchor = find_anchor_after(lines, heading_index)
    if not anchor:
        return

    cursor = find_next_non_empty_index(lines, anchor[0] + 1)
    if cursor is None:
        return

    if lines[cursor].strip() != f"`{heading}`":
        return

    del lines[cursor]
    cleanup_extra_blank_line(lines, cursor)


def update_current_section(
    line: str,
    sections: list[dict[str, object]],
    current_section: dict[str, object] | None,
) -> dict[str, object] | None:
    """Update TOC section context based on rendered h1 section headers."""
    parsed = parse_section_header(line)
    if not parsed:
        return current_section

    section_id, section_name = parsed
    if section_id == ROOT_DOC_SECTION_ID:
        return None

    next_section = {"id": section_id, "name": section_name, "items": []}
    sections.append(next_section)
    return next_section


def collect_toc_sections(lines: list[str]) -> list[dict[str, object]]:
    """Collect TOC sections and operation items from markdown lines."""
    sections: list[dict[str, object]] = []
    current_section: dict[str, object] | None = None

    for index, line in enumerate(lines):
        current_section = update_current_section(line, sections, current_section)

        heading = extract_h2_heading(line)
        if not heading or not is_method_heading(heading) or current_section is None:
            continue

        anchor = find_anchor_after(lines, index)
        if not anchor:
            continue

        items = current_section["items"]
        if isinstance(items, list):
            items.append((heading, anchor[1]))

    return sections


def render_toc(sections: list[dict[str, object]]) -> list[str]:
    """Render markdown TOC block from collected sections."""
    toc = ["<!-- TOC START -->", "## Table of Contents", ""]

    for section in sections:
        items = section.get("items", [])
        if not isinstance(items, list) or not items:
            continue

        toc.append(f"- [{section['name']}](#{section['id']})")
        for heading, anchor in items:
            toc.append(f"  - [{heading}](#{anchor})")

    toc.extend(["", "<!-- TOC END -->", ""])
    return toc


def rewrite_endpoint_headers(lines: list[str]) -> None:
    """Replace operation ids in endpoint headings with METHOD + path."""
    for index, line in enumerate(lines):
        heading = extract_h2_heading(line)
        if not heading or is_method_heading(heading):
            continue

        method_path = find_method_line_after(lines, index)
        if method_path:
            lines[index] = f"## {method_path}"


def remove_duplicate_inline_method_path(lines: list[str]) -> None:
    """Remove duplicate inline METHOD /path lines under endpoint headings."""
    for index, line in enumerate(lines):
        heading = extract_h2_heading(line)
        if not heading or not is_method_heading(heading):
            continue
        remove_duplicate_inline_after_heading(lines, index, heading)


def build_toc(lines: list[str]) -> list[str]:
    """Build table of contents lines grouped by section."""
    sections = collect_toc_sections(lines)
    return render_toc(sections)


def upsert_toc(lines: list[str], toc: list[str]) -> None:
    """Replace existing TOC block or insert a new TOC block."""
    start = None
    end = None
    for index, line in enumerate(lines):
        if line.strip() == "<!-- TOC START -->":
            start = index
        if line.strip() == "<!-- TOC END -->":
            end = index
            break

    if start is not None and end is not None and end >= start:
        del lines[start : end + 1]

    insert_at = len(lines)
    for index, line in enumerate(lines):
        section = parse_section_header(line)
        if section and section[0] != ROOT_DOC_SECTION_ID:
            insert_at = index
            break

    lines[insert_at:insert_at] = toc


def rewrite_api_wiki() -> None:
    """Rewrite api_wiki.md headings and TOC for wiki readability."""
    lines = API_WIKI_FILE.read_text(encoding="utf-8").splitlines()
    rewrite_endpoint_headers(lines)
    remove_duplicate_inline_method_path(lines)
    upsert_toc(lines, build_toc(lines))
    API_WIKI_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def generate_api_docs() -> None:
    """Generate schema.yml and api_wiki.md, then post-process markdown."""
    if not BACKEND_DIR.exists():
        raise FileNotFoundError(f"Backend directory not found: {BACKEND_DIR}")
    if not (BACKEND_DIR / "manage.py").exists():
        raise FileNotFoundError(f"manage.py not found in: {BACKEND_DIR}")

    run_command(
        [sys.executable, "manage.py", "spectacular", "--file", SCHEMA_FILE.name],
        cwd=BACKEND_DIR,
    )

    widdershins_command = resolve_widdershins_command()
    run_command(
        widdershins_command + [SCHEMA_FILE.name, "-o", API_WIKI_FILE.name],
        cwd=BACKEND_DIR,
    )

    rewrite_api_wiki()
    print(f"Updated {API_WIKI_FILE}")


if __name__ == "__main__":
    generate_api_docs()
