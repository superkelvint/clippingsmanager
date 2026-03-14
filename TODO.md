# TODO (Maintaining clippings.html)

This file tracks the staff-engineer review items and their implementation progress. As items are completed, they are crossed out.

## High-impact refactors

- [x] ~~Consolidate globals into a single `state` object and a single `els` element-cache (reduces hidden coupling).~~
- [x] ~~Stop reassigning element `id`s on every `generateTOC()`; introduce stable IDs for sections/subsections/entries (persisted in DOM).~~
- [ ] Split the script into clear internal “modules” (still a single HTML file): `persistence`, `editLock`, `editing`, `toc`, `search`, `highlight`, `modals`.

## Maintainability / correctness

- [x] ~~Split `triggerUpdate()` into `triggerStructureUpdate()` vs `triggerContentUpdate()`; avoid running heavy work for every keystroke.~~
- [x] ~~Prefer `textContent` over `innerText` when layout-sensitive text isn’t required.~~
- [x] ~~Avoid `innerHTML` for new section/subsection/entry creation; build nodes with `createElement` (reduces injection risk, easier refactors).~~

## Performance / scalability

- [ ] Make `autoTitle()` incremental (only the edited entry) instead of scanning all entries each update.
- [ ] Throttle/debounce `generateTOC()` and/or update only the affected subtree.
- [ ] Consider a “stable shell + serialized data blob” save format (still single-file) to avoid full-document cloning for save.

## Event / UI architecture

- [ ] Scope drag listeners to `#toc` instead of `document` where practical.
- [ ] Use `AbortController` to manage listener lifetimes, especially editing-only listeners.
- [ ] Make highlight popup behavior a small state machine (selection vs mark-target) to reduce race/flakiness.

## Code hygiene

- [ ] Normalize indentation/formatting in embedded JS (fix tab/space inconsistencies).
