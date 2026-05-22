#!/usr/bin/env python3
"""Push Japanese and Chinese translation files to Notion docs data source."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
DOCS_DB_ID = "7136b8b6-8958-82e2-b326-019f05c821ef"
CONTENT_DIR = Path(__file__).parent.parent / "content" / "docs"

if not NOTION_TOKEN:
    print("ERROR: NOTION_TOKEN is not set", file=sys.stderr)
    sys.exit(1)


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Extract frontmatter and body from markdown content."""
    if not content.startswith("---"):
        return {}, content
    end = content.index("---", 3)
    fm_text = content[3:end].strip()
    body = content[end + 3:].strip()
    fm = {}
    for line in fm_text.splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            fm[key.strip()] = val.strip()
    return fm, body


def create_notion_page(title: str, slug: str, markdown_body: str) -> dict:
    """Create a page in the Notion docs data source."""
    payload = {
        "parent": {"database_id": DOCS_DB_ID},
        "properties": {
            "Name": {"title": [{"text": {"content": title}}]},
            "Slug": {"rich_text": [{"text": {"content": slug}}]},
            "Public": {"checkbox": True},
        },
        "markdown": markdown_body,
    }
    payload_json = json.dumps(payload)

    result = subprocess.run(
        [
            "curl", "-s",
            "https://api.notion.com/v1/pages",
            "-H", f"Authorization: Bearer {NOTION_TOKEN}",
            "-H", "Notion-Version: 2026-03-11",
            "-H", "Content-Type: application/json",
            "-d", payload_json,
        ],
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def main():
    files = sorted(
        f for f in CONTENT_DIR.glob("*.md")
        if f.name.startswith("ja-") or f.name.startswith("zh-cn-")
    )

    print(f"Found {len(files)} translation files to push")

    success = 0
    errors = 0

    for filepath in files:
        content = filepath.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(content)
        title = fm.get("title", filepath.stem)
        slug = fm.get("slug", "")

        print(f"  Creating: {slug} ({title})")
        response = create_notion_page(title, slug, body)

        if response.get("object") == "page":
            page_id = response["id"]
            print(f"    ✓ Created page {page_id}")
            success += 1
        else:
            print(f"    ✗ Error: {response.get('message', response)}")
            errors += 1

    print(f"\nDone: {success} created, {errors} errors")
    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
