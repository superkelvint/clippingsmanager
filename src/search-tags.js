export function createSearchTags({
    state,
    els,
    defaultHighlightPalette,
    defaultTagPalette,
    tagPaletteOrder,
    clearSearchDecorations,
    getDirectChildEntries,
    getDirectChildContainers,
    syncEntryMoveButtons,
    triggerStructureUpdate,
}) {
        function normalizeWhitespace(value) {
            return String(value || '').replace(/\s+/g, ' ').trim();
        }

        function normalizeTag(value) {
            return normalizeWhitespace(value);
        }

        function normalizeTagKey(value) {
            return normalizeTag(value).toLowerCase();
        }

        function parseSearchQuery() {
            if (!els.entrySearch) {
                return { plainTerms: [], tagTerms: [], highlightTerms: [] };
            }

            const plainTerms = [];
            const tagTerms = [];
            const highlightTerms = [];
            const query = String(els.entrySearch.value || '');
            const tokenRegex = /tag:"([^"]+)"|tag:(\S+)|"([^"]+)"|(\S+)/gi;
            let match;

            while ((match = tokenRegex.exec(query))) {
                const quotedTag = match[1];
                const plainTag = match[2];
                const quotedPlain = match[3];
                const plainToken = match[4];

                if (quotedTag || plainTag) {
                    const rawTag = normalizeTag(quotedTag || plainTag);
                    const tagKey = normalizeTagKey(rawTag);
                    if (!tagKey) continue;
                    tagTerms.push(tagKey);
                    highlightTerms.push(rawTag);
                    continue;
                }

                const plainValue = normalizeWhitespace(quotedPlain || plainToken);
                if (!plainValue) continue;
                plainTerms.push(plainValue.toLowerCase());
                highlightTerms.push(plainValue);
            }

            return { plainTerms, tagTerms, highlightTerms };
        }

        function clearSelectedSearchTags() {
            state.selectedSearchTagKeys = [];
            state.selectedSearchTagMode = 'any';
        }

        function updateSelectedSearchTags({ tagKey, useAll = false, toggle = false }) {
            const normalizedKey = normalizeTagKey(tagKey);
            if (!normalizedKey) {
                clearSelectedSearchTags();
                return;
            }

            const current = state.selectedSearchTagKeys.slice();
            const alreadySelected = current.includes(normalizedKey);

            if (toggle) {
                if (alreadySelected) {
                    state.selectedSearchTagKeys = current.filter((key) => key !== normalizedKey);
                    if (state.selectedSearchTagKeys.length <= 1) {
                        state.selectedSearchTagMode = 'any';
                    }
                    return;
                }
                state.selectedSearchTagKeys = [...current, normalizedKey];
                state.selectedSearchTagMode = useAll ? 'all' : 'any';
                return;
            }

            if (current.length === 1 && alreadySelected && !useAll) {
                clearSelectedSearchTags();
                return;
            }

            if (useAll) {
                state.selectedSearchTagKeys = alreadySelected ? current : [...current, normalizedKey];
                state.selectedSearchTagMode = 'all';
                return;
            }

            state.selectedSearchTagKeys = [normalizedKey];
            state.selectedSearchTagMode = 'any';
        }

        function hashString(value) {
            const text = String(value || '');
            let hash = 0;
            for (let i = 0; i < text.length; i += 1) {
                hash = ((hash << 5) - hash) + text.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        }

        function getTagColorTheme(tag) {
            const key = normalizeTagKey(tag);
            const mappedIndex = key && state.knownTagColorMap ? state.knownTagColorMap.get(key) : null;
            const index = Number.isInteger(mappedIndex)
                ? mappedIndex
                : (key ? tagPaletteOrder[hashString(key) % tagPaletteOrder.length] : 0);
            return {
                index,
                ...defaultTagPalette[index]
            };
        }

        function rebuildKnownTagColorMap() {
            const nextMap = new Map();
            state.knownTags.forEach((tag, index) => {
                const key = normalizeTagKey(tag);
                if (!key) return;
                nextMap.set(key, tagPaletteOrder[index % tagPaletteOrder.length]);
            });
            state.knownTagColorMap = nextMap;
        }

        function applyTagColorTheme(tagEl) {
            if (!tagEl) return;
            const tagValue = tagEl.dataset.tagValue || tagEl.textContent || '';
            const theme = getTagColorTheme(tagValue);
            tagEl.dataset.tagColorIndex = String(theme.index);
            tagEl.style.setProperty('--tag-bg', theme.bg);
            tagEl.style.setProperty('--tag-border', theme.border);
            tagEl.style.setProperty('--tag-text', theme.text);
            tagEl.style.setProperty('--tag-remove-bg', theme.removeBg);
            tagEl.style.setProperty('--tag-remove-text', theme.removeText);
        }

        function createTagChip(tag) {
            const chip = document.createElement('span');
            chip.className = 'entry-tag';
            chip.setAttribute('data-testid', 'entry-tag');
            chip.dataset.tagValue = tag;
            chip.dataset.tagKey = normalizeTagKey(tag);

            const label = document.createElement('span');
            label.className = 'entry-tag-label';
            label.setAttribute('data-testid', 'entry-tag-label');
            label.textContent = tag;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'entry-tag-remove';
            remove.setAttribute('data-testid', 'entry-tag-remove');
            remove.setAttribute('aria-label', `Remove tag ${tag}`);
            remove.textContent = 'x';

            chip.append(label, remove);
            applyTagColorTheme(chip);
            return chip;
        }

        function getEntryTagsContainer(entry) {
            if (!entry) return null;
            return entry.querySelector('.entry-tags');
        }

        function getEntryTagRow(entry) {
            if (!entry) return null;
            return entry.querySelector('.entry-tag-row');
        }

        function getEntryTagInput(entry) {
            if (!entry) return null;
            return entry.querySelector('.entry-tag-input');
        }

        function isEntryTagEditMode(entry) {
            const row = getEntryTagRow(entry);
            return !!(row && row.dataset.editingTags === 'true');
        }

        function getEntryTags(entry) {
            const container = getEntryTagsContainer(entry);
            if (!container) return [];
            return Array.from(container.querySelectorAll('.entry-tag')).map((tagEl) => tagEl.dataset.tagValue || '').filter(Boolean);
        }

        function collectKnownTags(root = document) {
            const known = new Map();
            root.querySelectorAll('.entry-tag').forEach((tagEl) => {
                const tagValue = normalizeTag(tagEl.dataset.tagValue || tagEl.textContent || '');
                const tagKey = normalizeTagKey(tagValue);
                if (!tagKey || known.has(tagKey)) return;
                known.set(tagKey, tagValue);
            });

            return Array.from(known.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        }

        function collectTagEntryCounts(root = document) {
            const counts = new Map();
            root.querySelectorAll('.entry').forEach((entry) => {
                const seenInEntry = new Set();
                getEntryTags(entry).forEach((tag) => {
                    const key = normalizeTagKey(tag);
                    if (!key || seenInEntry.has(key)) return;
                    seenInEntry.add(key);
                    const current = counts.get(key) || { tag, count: 0 };
                    current.count += 1;
                    counts.set(key, current);
                });
            });
            return counts;
        }

        function syncTagControls(root = document) {
            const isEditing = document.body.classList.contains('is-editing');
            root.querySelectorAll('.entry-tag-row').forEach((row) => {
                const isTagEditing = row.dataset.editingTags === 'true';
                const editToggle = row.querySelector('.entry-tag-edit-toggle');
                const doneButton = row.querySelector('.entry-tag-done');

                row.dataset.hasTags = row.querySelectorAll('.entry-tag').length > 0 ? 'true' : 'false';

                if (editToggle) {
                    editToggle.textContent = row.dataset.hasTags === 'true' ? 'Edit Tags' : 'Add Tags';
                    editToggle.disabled = !isEditing;
                }
                if (doneButton) {
                    doneButton.disabled = !isEditing;
                }

                row.querySelectorAll('.entry-tag-input, .entry-tag-add, .entry-tag-remove').forEach((el) => {
                    el.disabled = !isEditing || !isTagEditing;
                });
                row.querySelectorAll('.entry-tag').forEach((tagEl) => {
                    applyTagColorTheme(tagEl);
                });
            });
        }

        function refreshKnownTags(root = document) {
            state.knownTags = collectKnownTags(root);
            rebuildKnownTagColorMap();
            if (!els.knownTagOptions) return;

            els.knownTagOptions.replaceChildren();
            state.knownTags.forEach((tag) => {
                const option = document.createElement('option');
                option.value = tag;
                els.knownTagOptions.appendChild(option);
            });
            renderSearchTagFilters(root);
        }

        function renderSearchTagFilters(root = document) {
            if (!els.searchTagFilters) return;

            const counts = collectTagEntryCounts(root);
            els.searchTagFilters.replaceChildren();

            if (state.knownTags.length === 0) {
                els.searchTagFilters.hidden = true;
                if (els.searchTagFiltersHelp) els.searchTagFiltersHelp.hidden = true;
                return;
            }

            const fragment = document.createDocumentFragment();
            state.knownTags
                .map((tag) => {
                    const key = normalizeTagKey(tag);
                    return {
                        tag,
                        key,
                        count: counts.get(key)?.count || 0
                    };
                })
                .filter((item) => item.count > 0)
                .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' }))
                .forEach((item) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'search-tag-filter';
                    button.setAttribute('data-testid', 'search-tag-filter');
                    button.dataset.tagValue = item.tag;
                    button.dataset.tagKey = item.key;
                    button.dataset.tagCount = String(item.count);
                    applyTagColorTheme(button);
                    if (state.selectedSearchTagKeys.includes(item.key)) {
                        button.dataset.active = 'true';
                    }
                    button.textContent = `${item.tag} (${item.count})`;
                    fragment.appendChild(button);
                });

            els.searchTagFilters.appendChild(fragment);
            els.searchTagFilters.hidden = els.searchTagFilters.childElementCount === 0;
            const hasSelectedTags = state.selectedSearchTagKeys.length > 0;
            const selectionMode = !hasSelectedTags
                ? 'none'
                : (state.selectedSearchTagMode === 'all' && state.selectedSearchTagKeys.length > 1 ? 'all' : 'any');
            els.searchTagFilters.dataset.selectionMode = selectionMode;
            if (els.searchTagFiltersHelp) {
                els.searchTagFiltersHelp.hidden = els.searchTagFilters.childElementCount === 0;
                els.searchTagFiltersHelp.dataset.mode = selectionMode;
                if (selectionMode === 'all') {
                    els.searchTagFiltersHelp.textContent = 'Filtering by ALL selected tags. Click a selected tag to clear it. Ctrl/Cmd-click adds tags with OR. Shift-click adds tags with AND.';
                } else if (selectionMode === 'any' && hasSelectedTags) {
                    els.searchTagFiltersHelp.textContent = 'Filtering by ANY selected tags. Click a selected tag to clear it. Ctrl/Cmd-click adds tags with OR. Shift-click adds tags with AND.';
                } else {
                    els.searchTagFiltersHelp.textContent = 'Click a tag to filter. Ctrl/Cmd-click adds tags with OR. Shift-click adds tags with AND.';
                }
            }
        }

        function ensureEntryTagUi(entry) {
            if (!entry || entry.querySelector('.entry-tag-row')) {
                syncTagControls(entry || document);
                return entry;
            }

            const tagRow = document.createElement('div');
            tagRow.className = 'entry-tag-row';
            tagRow.setAttribute('data-testid', 'entry-tag-row');

            const tagLabel = document.createElement('span');
            tagLabel.className = 'entry-tag-heading';
            tagLabel.textContent = 'Tags';

            const tags = document.createElement('div');
            tags.className = 'entry-tags';
            tags.setAttribute('data-testid', 'entry-tags');

            const controls = document.createElement('div');
            controls.className = 'entry-tag-controls';

            const editToggle = document.createElement('button');
            editToggle.type = 'button';
            editToggle.className = 'entry-tag-edit-toggle';
            editToggle.setAttribute('data-testid', 'entry-tag-edit-toggle');
            editToggle.textContent = 'Add Tags';

            const doneButton = document.createElement('button');
            doneButton.type = 'button';
            doneButton.className = 'entry-tag-done';
            doneButton.setAttribute('data-testid', 'entry-tag-done');
            doneButton.textContent = 'Done';

            const inputRow = document.createElement('div');
            inputRow.className = 'entry-tag-input-row';
            inputRow.setAttribute('data-testid', 'entry-tag-input-row');

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'entry-tag-input';
            input.setAttribute('data-testid', 'entry-tag-input');
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('placeholder', 'Add a tag');
            input.setAttribute('list', 'known-tag-options');

            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.className = 'entry-tag-add';
            addButton.setAttribute('data-testid', 'entry-tag-add');
            addButton.textContent = 'Add Tag';

            controls.append(editToggle, doneButton);
            inputRow.append(input, addButton);
            tagRow.dataset.editingTags = 'false';
            tagRow.append(tagLabel, tags, controls, inputRow);

            const text = entry.querySelector('.text');
            if (text && text.nextSibling) {
                entry.insertBefore(tagRow, text.nextSibling);
            } else {
                entry.appendChild(tagRow);
            }

            syncTagControls(tagRow);
            return entry;
        }

        function enhanceEntries(root = document) {
            root.querySelectorAll('.entry').forEach((entry) => ensureEntryTagUi(entry));
            syncEntryMoveButtons(root);
            syncTagControls(root);
            refreshKnownTags(root);
        }

        function setEntryTagEditMode(entry, isEditingTags, { focusInput = false, clearDraft = false } = {}) {
            const row = getEntryTagRow(entry);
            if (!row) return;

            row.dataset.editingTags = isEditingTags ? 'true' : 'false';
            const input = getEntryTagInput(entry);
            if (!isEditingTags && clearDraft && input) {
                input.value = '';
            }
            syncTagControls(entry);
            if (isEditingTags && focusInput && input) {
                input.focus();
            }
        }

        function setEntryTags(entry, tags, { preserveInput = false } = {}) {
            ensureEntryTagUi(entry);
            const container = getEntryTagsContainer(entry);
            if (!container) return;

            const seen = new Set();
            const normalizedTags = [];
            tags.forEach((tag) => {
                const normalized = normalizeTag(tag);
                const key = normalizeTagKey(normalized);
                if (!key || seen.has(key)) return;
                seen.add(key);
                normalizedTags.push(normalized);
            });

            container.replaceChildren(...normalizedTags.map((tag) => createTagChip(tag)));
            entry.dataset.tags = JSON.stringify(normalizedTags);
            if (!preserveInput) {
                const input = getEntryTagInput(entry);
                if (input) input.value = '';
            }
            refreshKnownTags(document);
            syncTagControls(document);
        }

        function removeTagFromEntry(entry, tagKey) {
            const nextTags = getEntryTags(entry).filter((tag) => normalizeTagKey(tag) !== tagKey);
            setEntryTags(entry, nextTags);
        }

        function addTagToEntry(entry, rawTag) {
            if (!entry) return false;

            const normalized = normalizeTag(rawTag);
            const normalizedKey = normalizeTagKey(normalized);
            if (!normalizedKey) return false;

            const canonicalTag = state.knownTags.find((tag) => normalizeTagKey(tag) === normalizedKey) || normalized;
            const currentTags = getEntryTags(entry);
            if (currentTags.some((tag) => normalizeTagKey(tag) === normalizedKey)) {
                const input = getEntryTagInput(entry);
                if (input) input.value = '';
                return false;
            }

            setEntryTags(entry, [...currentTags, canonicalTag]);
            return true;
        }

        function commitTagInput(entry) {
            const input = getEntryTagInput(entry);
            if (!input) return false;

            const rawValue = normalizeTag(input.value);
            if (!rawValue) {
                input.value = '';
                return false;
            }

            return addTagToEntry(entry, rawValue);
        }

        function finishTagEditing(entry) {
            if (!entry) return;
            setEntryTagEditMode(entry, false, { clearDraft: true });
            triggerStructureUpdate();
        }

        function escapeRegExp(text) {
            return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function highlightSearchMatches(container, terms) {
            if (!container || terms.length === 0) return;

            const pattern = terms
                .map((term) => escapeRegExp(term))
                .sort((a, b) => b.length - a.length)
                .join('|');
            if (!pattern) return;

            const regex = new RegExp(pattern, 'gi');
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    if (parent.closest('.search-hit')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            const textNodes = [];
            while (walker.nextNode()) {
                textNodes.push(walker.currentNode);
            }

            textNodes.forEach((node) => {
                regex.lastIndex = 0;
                const text = node.textContent;
                const matches = [...text.matchAll(regex)];
                if (matches.length === 0) return;

                const fragment = document.createDocumentFragment();
                let lastIndex = 0;

                matches.forEach((match) => {
                    const index = match.index ?? -1;
                    if (index < lastIndex) return;
                    if (index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
                    }
                    const hit = document.createElement('span');
                    hit.className = 'search-hit';
                    hit.textContent = match[0];
                    fragment.appendChild(hit);
                    lastIndex = index + match[0].length;
                });

                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                }

                node.parentNode.replaceChild(fragment, node);
            });
        }

        function applyEntrySearch() {
            clearSearchDecorations(document);
            const { plainTerms, tagTerms, highlightTerms } = parseSearchQuery();
            const hasTypedTerms = plainTerms.length > 0 || tagTerms.length > 0;
            const hasSelectedTagFilters = state.selectedSearchTagKeys.length > 0;

            document.querySelectorAll('.entry').forEach((entry) => {
                ensureEntryTagUi(entry);
                const titleEl = entry.querySelector('.entry-title');
                const sourceEl = entry.querySelector('.source');
                const textEl = entry.querySelector('.text');
                const tagLabelEls = Array.from(entry.querySelectorAll('.entry-tag-label'));
                const tagValues = getEntryTags(entry);
                const textHaystack = [
                    titleEl ? titleEl.innerText : '',
                    sourceEl ? sourceEl.innerText : '',
                    textEl ? textEl.innerText : '',
                    tagValues.join(' ')
                ].join('\n').toLowerCase();
                const entryTagKeys = tagValues.map((tag) => normalizeTagKey(tag));
                const plainMatch = plainTerms.length > 0 && plainTerms.some((term) => textHaystack.includes(term));
                const tagMatch = tagTerms.length > 0 && tagTerms.some((term) => entryTagKeys.includes(term));
                const baseMatches = !hasTypedTerms || plainMatch || tagMatch;
                const selectedTagMatches = !hasSelectedTagFilters || (
                    state.selectedSearchTagMode === 'all'
                        ? state.selectedSearchTagKeys.every((term) => entryTagKeys.includes(term))
                        : state.selectedSearchTagKeys.some((term) => entryTagKeys.includes(term))
                );
                const matches = baseMatches && selectedTagMatches;
                entry.hidden = !matches;
                if (matches && hasTypedTerms) {
                    [titleEl, sourceEl, textEl, ...tagLabelEls].forEach((el) => highlightSearchMatches(el, highlightTerms));
                }
            });

            const hasActiveFilters = hasTypedTerms || hasSelectedTagFilters;
            const updateContainerVisibility = (container) => {
                const hasVisibleDirectEntries = getDirectChildEntries(container).some((entry) => !entry.hidden);
                const hasVisibleChildContainers = getDirectChildContainers(container).some((childContainer) => updateContainerVisibility(childContainer));
                container.hidden = hasActiveFilters && !hasVisibleDirectEntries && !hasVisibleChildContainers;
                return !container.hidden;
            };
            getDirectChildContainers(document.getElementById('app-root')).forEach((container) => {
                updateContainerVisibility(container);
            });

            renderSearchTagFilters(document.getElementById('app-root'));
        }

	        function clearEntrySearch() {
	            if (!els.entrySearch) return;
                const hadSelectedTags = state.selectedSearchTagKeys.length > 0;
	            if (els.entrySearch.value === '' && !hadSelectedTags) return;
	            els.entrySearch.value = '';
                clearSelectedSearchTags();
	            applyEntrySearch();
	        }

        function hasActiveEntrySearch() {
            if (!els.entrySearch) return state.selectedSearchTagKeys.length > 0;
            return els.entrySearch.value.trim() !== '' || state.selectedSearchTagKeys.length > 0;
        }

        function applyEntrySearchPreservingScroll() {
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            applyEntrySearch();
            window.requestAnimationFrame(() => {
                window.scrollTo(scrollX, scrollY);
            });
        }

    return {
        normalizeWhitespace,
        normalizeTag,
        normalizeTagKey,
        parseSearchQuery,
        clearSelectedSearchTags,
        updateSelectedSearchTags,
        applyTagColorTheme,
        getEntryTagRow,
        getEntryTagInput,
        isEntryTagEditMode,
        getEntryTags,
        syncTagControls,
        refreshKnownTags,
        ensureEntryTagUi,
        enhanceEntries,
        setEntryTagEditMode,
        setEntryTags,
        removeTagFromEntry,
        addTagToEntry,
        commitTagInput,
        finishTagEditing,
        applyEntrySearch,
        clearEntrySearch,
        hasActiveEntrySearch,
        applyEntrySearchPreservingScroll,
    };
}
