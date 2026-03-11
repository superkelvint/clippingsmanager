#!/usr/bin/env python3
import re
import sys
import argparse
import os

"""
Clippings Manager Migration Tool
Migrates your notes from an older clippings.html version to a newer one.
Zero dependencies. Works with Python 3.
"""

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

def migrate(data_file, template_file, output_file):
    print(f"Reading data from: {data_file}")
    with open(data_file, 'r', encoding='utf-8') as f:
        old_html = f.read()

    print(f"Reading template from: {template_file}")
    with open(template_file, 'r', encoding='utf-8') as f:
        new_html = f.read()

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
    parser.add_argument("template_file", help="The new clippings.html (the application, e.g., clippings_v0.2.0.html)")
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
    
    if not os.path.exists(args.template_file):
        print(f"Error: Template file '{args.template_file}' not found.")
        sys.exit(1)

    migrate(args.data_file, args.template_file, output)

if __name__ == "__main__":
    main()
