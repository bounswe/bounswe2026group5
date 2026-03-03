import argparse
import os
import re

from bs4 import BeautifulSoup


def extract_date_and_clean_text(text: str, url: str) -> tuple[str, str]:
    text_match = re.search(r"\((\d{2}[/.]\d{2}[/.]\d{4})\)", text)
    if text_match:
        raw_date = text_match.group(1)
        date = raw_date.replace(".", "/")
        clean_text = re.sub(r"\s*\(\d{2}[/.]\d{2}[/.]\d{4}\)\s*$", "", text).strip()
        return date, clean_text

    url_match = re.search(r"(\d{2})[.-](\d{2})[.-](\d{4})", url)
    if url_match:
        date = f"{url_match.group(1)}/{url_match.group(2)}/{url_match.group(3)}"
        return date, text.strip()

    return "TBD", text.strip()


def clean_url(url: str) -> str:
    # Remove trailing date suffix in page slug, e.g.:
    # Weekly-Meeting-3-(04.03.2026) -> Weekly-Meeting-3
    return re.sub(r"-\(\d{2}[./-]\d{2}[./-]\d{4}\)$", "", url.strip())


def get_links(soup: BeautifulSoup, header_name: str) -> list[dict[str, str]]:
    links = []
    target = soup.find(
        lambda tag: tag.name in ["h2", "summary"] and header_name.lower() in tag.get_text().lower()
    )
    if not target:
        return links

    ul = target.find_next("ul")
    if not ul:
        return links

    for a in ul.find_all("a"):
        text = a.get_text().strip()
        raw_url = a.get("href", "").strip()
        date, clean_text = extract_date_and_clean_text(text, raw_url)
        links.append({"date": date, "text": clean_text, "url": clean_url(raw_url)})

    return links


def replace_section(md_text: str, section_title: str, new_content: str) -> str:
    lines = md_text.splitlines()

    heading_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("## ") and section_title.lower() in line.lower():
            heading_idx = i
            break

    if heading_idx == -1:
        print(f"⚠️ Section not found in Home.md: {section_title}")
        return md_text

    end_idx = len(lines)
    for i in range(heading_idx + 1, len(lines)):
        if lines[i].startswith("## "):
            end_idx = i
            break

    content_lines = new_content.splitlines()
    lines = lines[: heading_idx + 1] + content_lines + [""] + lines[end_idx:]

    print(f"✅ Synced section: {section_title}")
    return "\n".join(lines) + "\n"


def sync_wiki(wiki_dir: str) -> None:
    sidebar_path = os.path.join(wiki_dir, "_Sidebar.md")
    home_path = os.path.join(wiki_dir, "Home.md")

    if not os.path.exists(sidebar_path) or not os.path.exists(home_path):
        print(f"❌ Error: Wiki files not found in {wiki_dir}")
        return

    with open(sidebar_path, "r", encoding="utf-8") as f:
        sidebar_html = f.read()
    with open(home_path, "r", encoding="utf-8") as f:
        home_md = f.read()

    soup = BeautifulSoup(sidebar_html, "html.parser")

    meetings = get_links(soup, "Weekly Meetings")
    labs = get_links(soup, "Lab Reports")

    meeting_rows = "\n".join([f"| {l['date']} | [{l['text']}]({l['url']}) |" for l in meetings])
    lab_rows = "\n".join([f"| {l['date']} | [{l['text']}]({l['url']}) |" for l in labs])

    meeting_table = "| Date | Meeting Link |\n| --- | --- |\n" + (
        meeting_rows if meeting_rows else "| TBD | No meetings yet |"
    )
    lab_table = "| Date | Lab Report Link |\n| --- | --- |\n" + (
        lab_rows if lab_rows else "| TBD | No lab reports yet |"
    )

    home_md = replace_section(home_md, "Weekly Meetings", meeting_table)
    home_md = replace_section(home_md, "Lab Reports", lab_table)

    with open(home_path, "w", encoding="utf-8") as f:
        f.write(home_md)

    print("🚀 Done!")


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)

    parser = argparse.ArgumentParser(description="Sync wiki Home.md sections from _Sidebar.md")
    parser.add_argument(
        "--wiki-dir",
        default=os.path.join(repo_root, "wiki"),
        help="Path to wiki git repo directory (default: ./wiki)",
    )
    args = parser.parse_args()

    sync_wiki(args.wiki_dir)


if __name__ == "__main__":
    main()
