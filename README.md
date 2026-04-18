# Clippings Manager

Clippings Manager is a single-file, self-contained, fully-offline HTML app for preparing presentation notes in a structured outline.

It is designed around a simple hierarchy:

- Sections for major topics
- Optional subsections inside each section
- Entries inside sections or subsections for individual notes

The HTML file is both the app and the document. Your notes are stored directly inside that file, so there is no backend, no database, and no need to be connected to the Internet.

## What It Does

Clippings Manager helps you collect and organize material for a presentation in a format that stays easy to scan while you are writing and easy to present from later.

Each entry includes:

- A title
- A source field
- Optional tags
- A note body

The app also generates a table of contents from your structure, and the built-in search can match titles, sources, note text, and tags so long note sets remain navigable.

## Demo

<p align="center">
  <a href="https://downloads.supermind.org/clippings-demo.mp4">
    Watch the walkthrough video!
  </a>
</p>

## Offline And Private

Clippings Manager is built to work entirely on your machine.

- No Internet connection is required to use it
- There is no server, backend, database, login, or account
- Your notes stay inside the local HTML file you save on your own computer
- Nothing in the app is designed to upload, sync, or send your notes anywhere

If you want a notes tool that is simple, local-first, and easy to keep private, this is the point of the project.

## How It Works

Open clippings.html in a Chromium-based browser such as Chrome, Edge, Brave, Arc, or Opera.

By default, the page opens in read-only mode. When you click `Enable Editing`, the app asks you to choose an HTML file using the browser's File System Access API. After that:

- The document becomes editable
- Changes are auto-saved back to the selected HTML file
- `Ctrl/Cmd + S` forces an immediate save
- Exiting editing returns the page to read-only mode
- If the same file is in Editing mode in another tab, you’ll be warned to prevent accidental overwrites

Because the document saves back into the HTML itself, you can duplicate the file to create a fresh notes document.

## Installation

There is no installer. This project is a single HTML file.

To get started:

1. Download [`clippings.html`](https://github.com/superkelvint/clippingsmanager/raw/refs/heads/main/clippings.html) from this repository.
2. Save it somewhere on your computer as an `.html` file.
3. Open that saved file in a Chromium-based browser such as Chrome, Edge, Brave, Arc, or Opera.
4. Click `Enable Editing`.
5. When the browser prompts you to choose a file, select the same `clippings.html` file you just saved.

To create a separate notes file for a new presentation:

1. Copy `clippings.html`.
2. Rename the copy.
3. Open the copied file and edit that one instead.

## Migration (Upgrading)

When a new version of Clippings Manager is released, you can migrate your existing notes to the new template by visiting [`https://superkelvint.github.io/clippingsmanager/migrate.html`](https://superkelvint.github.io/clippingsmanager/migrate.html)

## Features

- Single self-contained HTML file
- Fully offline operation after download
- Local-first document storage
- Structured notes with sections, subsections, and entries
- Editable document title
- Auto-generated entry titles when left blank
- Per-entry tags with autocomplete and tag-aware search
- Table of contents with optional entry-level links
- Drag-and-drop reordering for sections, subsections, and entries
- Read-only mode to prevent accidental edits
- Auto-save to disk while editing
- Reset flow with typed title confirmation
- Sanitized paste/drop handling to keep formatting simple and prevent structural HTML from being injected

## Editing Model

While editing is enabled:

- Add sections with `+ Add Section`
- Add subsections or entries inside a section
- Add entries inside subsections
- Add tags to entries to track topics or themes
- Delete items with the red delete buttons
- Reorder items with the `⋮⋮` drag handles

Search is available in both read-only and editing mode:

- Search matches entry titles, sources, note text, and tags
- Tags autocomplete from tags already used in the same document

Formatting is intentionally minimal:

- `Ctrl/Cmd + B` for bold
- `Ctrl/Cmd + I` for italic
- `Enter` inserts a line break in note text
- `Enter` on section or subsection titles commits the title line

## Browser Requirement

Editing and saving depend on the browser File System Access API. In practice, that means:

- Chromium-based browsers are supported for editing/saving
- Non-Chromium browsers can still open the file, but editing controls are disabled

## File Layout

- [`clippings.html`](clippings.html): the complete application, UI, logic, and stored document content
- [`clippings-migrate.py`](clippings-migrate.py): a zero-dependency Python script for migrating notes between versions
- [`src/clippings.js`](src/clippings.js): source-of-truth JavaScript (merged into `clippings.html` on commit)
- [`scripts/build-singlefile.mjs`](scripts/build-singlefile.mjs): merges `src/clippings.js` into `clippings.html`
- [`record-demo.mjs`](record-demo.mjs): deterministic CDP-based script that regenerates `clippings-demo.mp4`

## Typical Use

1. Open `clippings.html` in a supported browser.
2. Click `Enable Editing` and choose the file.
3. Build your outline with sections, headings, and entries.
4. Paste source snippets, add tags, and write notes under each entry.
5. Search by keywords or tags while refining the structure.
6. Reorder content as the presentation structure settles.
7. Present or review directly from the saved HTML file.

## No Setup

For end users: there are no dependencies, no server, and no build step. Once you have the HTML file on your computer, the app works fully offline and keeps your notes in that local file.

## Tests (Developer)

End-to-end tests run the single-file app in headless Chrome and validate core flows like TOC-based reordering.

- Install: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` (uses your installed Chrome via Playwright `channel`)
- Run: `npm test`
- Skip (for hooks/CI): `SKIP_CLIPPINGS_E2E=1`
- Use a different browser channel: `PW_CHROME_CHANNEL=chromium npm test`

Tests run against a per-test temporary copy of `clippings.html` so the original file is never modified.

### Git pre-commit hook

This repo includes a versioned hook in `.githooks/`. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```
