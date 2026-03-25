#!/usr/bin/env python3
import re
import sys
import argparse
import os
import urllib.request
import urllib.error

"""
Clippings Manager Migration Tool
Migrates your notes from an older clippings.html version to a newer one.
Zero dependencies. Works with Python 3.
"""

DEFAULT_TEMPLATE_URL = "https://raw.githubusercontent.com/superkelvint/clippingsmanager/refs/heads/main/clippings.html"

def get_tag_inner(html, tag_name, tag_id):
    pattern = rf'<{tag_name}[^>]*id="{tag_id}"[^>]*>(.*?)</{tag_name}>'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        return match.group(1)
    return None

def set_tag_inner(html, tag_name, tag_id, new_inner):
    pattern = rf'<{tag_name}[^>]*id="{tag_id}"[^>]*>(.*?)</{tag_name}>'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        start, end = match.span(1)
        return html[:start] + new_inner + html[end:]
    return html

def get_title(html):
    match = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
    return match.group(1) if match else None

def set_title(html, new_title):
    match = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
    if match:
        start, end = match.span(1)
        return html[:start] + new_title + html[end:]
    return html

def fetch_template_html(url, timeout_seconds=15):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "clippings-migrate.py (Python urllib)"
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        body = resp.read()
        return body.decode(charset, errors="replace")

def read_template_html(template_file, template_url):
    if template_file:
        print(f"Reading template from: {template_file}")
        with open(template_file, 'r', encoding='utf-8') as f:
            return f.read()

    print(f"Downloading latest template from: {template_url}")
    try:
        return fetch_template_html(template_url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as err:
        print("Error: Could not download the latest clippings.html template.")
        print(f"Reason: {err}")
        print("\nTip: If you're offline, pass a local template file path as the optional second argument.")
        sys.exit(1)

def migrate(data_file, template_file, template_url, output_file):
    print(f"Reading data from: {data_file}")
    with open(data_file, 'r', encoding='utf-8') as f:
        old_html = f.read()

    new_html = read_template_html(template_file, template_url)

    # Data to migrate
    fields = [
        ('h1', 'main-title'),
        ('main', 'app-root'),
        ('script', 'highlight-palette-data')
    ]

    migrated_html = new_html

    # Extract and replace each field
    for tag, tid in fields:
        old_content = get_tag_inner(old_html, tag, tid)
        if old_content is not None:
            print(f"Migrating field: {tid}")
            migrated_html = set_tag_inner(migrated_html, tag, tid, old_content)
        else:
            print(f"Warning: Could not find field '{tid}' in {data_file}. Skipping.")

    # Special case for <title>
    old_title = get_title(old_html)
    if old_title:
        print(f"Migrating title: {old_title}")
        migrated_html = set_title(migrated_html, old_title)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(migrated_html)
    
    print(f"\nMigration complete! Saved to: {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Migrate Clippings Manager notes to a new version.")
    parser.add_argument("data_file", help="Your existing notes file (older version, e.g., my_notes.html)")
    parser.add_argument(
        "template_file",
        nargs="?",
        default=None,
        help="Optional local clippings.html template file. If omitted, downloads the latest from GitHub."
    )
    parser.add_argument(
        "--template-url",
        default=DEFAULT_TEMPLATE_URL,
        help=f"Template URL to download when template_file is omitted (default: {DEFAULT_TEMPLATE_URL})"
    )
    parser.add_argument("-o", "--output", help="Output file path (default: <data_file>_migrated.html)")

    args = parser.parse_args()

    if not args.output:
        base, ext = os.path.splitext(args.data_file)
        output = f"{base}_migrated{ext}"
    else:
        output = args.output
    
    if not os.path.exists(args.data_file):
        print(f"Error: Data file '{args.data_file}' not found.")
        sys.exit(1)
    
    if args.template_file and not os.path.exists(args.template_file):
        print(f"Error: Template file '{args.template_file}' not found.")
        sys.exit(1)

    migrate(args.data_file, args.template_file, args.template_url, output)

if __name__ == "__main__":
    main()
