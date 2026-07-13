export function createHighlights({
    state,
    els,
    defaultHighlightPalette,
    insertFragmentAtCursor,
    triggerContentUpdate,
    scheduleAutosave,
    unwrapElement,
}) {
        function normalizeColorValue(rawColor) {
            const probe = document.createElement('span');
            probe.style.backgroundColor = '';
            probe.style.backgroundColor = rawColor || '';
            return probe.style.backgroundColor || '';
        }

        function colorValueForColorInput(rawColor) {
            const normalized = normalizeColorValue(rawColor);
            if (!normalized) return defaultHighlightPalette[0];

            const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
            if (hexMatch) {
                return `#${hexMatch[1].toLowerCase()}`;
            }

            const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
            if (!rgbMatch) return defaultHighlightPalette[0];

            const toHex = (value) => Number(value).toString(16).padStart(2, '0');
            return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
        }

        function updateAllHighlightsForColor(fromColor, toColor) {
            const from = normalizeColorValue(fromColor);
            const to = normalizeColorValue(toColor);
            if (!from || !to || from === to) return;

            document.querySelectorAll('.highlight-mark').forEach((el) => {
                const styleColor = normalizeColorValue(el.style.backgroundColor);
                const dataColor = normalizeColorValue(el.dataset.highlightColor || el.getAttribute('data-highlight-color') || '');
                const current = styleColor || dataColor;
                if (!current) return;
                if (current !== from) return;
                el.style.backgroundColor = to;
                el.dataset.highlight = 'true';
                el.dataset.highlightColor = to;
            });
        }

	        function readStoredHighlightPalette() {
	            try {
	                const raw = (els.highlightPaletteData && els.highlightPaletteData.textContent) || '';
	                const parsed = JSON.parse(raw);
	                if (!Array.isArray(parsed)) return [];
	                return parsed
	                    .map((value) => normalizeColorValue(value))
	                    .filter(Boolean);
            } catch (err) {
                console.warn('Could not parse highlight palette data:', err);
                return [];
            }
        }

	        function persistHighlightPalette() {
	            if (els.highlightPaletteData) {
	                els.highlightPaletteData.textContent = JSON.stringify(state.highlightPalette);
	            }
	            localStorage.setItem('highlight-palette', JSON.stringify(state.highlightPalette));
	        }

	        function createHighlightPopupSwatch(color) {
            const normalized = normalizeColorValue(color) || normalizeColorValue(defaultHighlightPalette[0]);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'highlight-popup-swatch';
            button.setAttribute('data-testid', 'highlight-swatch');
            button.dataset.color = normalized;
            button.title = `Apply ${normalized} highlight`;
            button.style.backgroundColor = normalized;
	            button.addEventListener('mousedown', (e) => {
	                e.preventDefault();
	                if (state.highlightTargetMark) {
	                    applyColorToActiveHighlight(normalized);
	                } else {
	                    applyHighlight(normalized);
	                }
	            });
            return button;
        }

        function createHighlightPopupDelete() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'highlight-popup-delete';
            button.setAttribute('data-testid', 'highlight-unhighlight');
            button.textContent = 'Unhighlight';
            button.addEventListener('click', () => {
                deleteActiveHighlight();
            });
            return button;
        }

	        function renderHighlightPopup() {
	            if (!els.highlightPopup) return;
	            els.highlightPopup.replaceChildren();

	            if (state.highlightPalette.length === 0) {
	                const empty = document.createElement('p');
	                empty.className = 'highlight-popup-empty';
	                empty.textContent = 'Add a palette color first';
	                els.highlightPopup.appendChild(empty);
	                if (state.highlightTargetMark) {
	                    const deleteBtn = createHighlightPopupDelete();
	                    els.highlightPopup.appendChild(deleteBtn);
	                }
	                return;
	            }

	            state.highlightPalette.forEach((color) => {
	                els.highlightPopup.appendChild(createHighlightPopupSwatch(color));
	            });
	            if (state.highlightTargetMark) {
	                const deleteBtn = createHighlightPopupDelete();
	                els.highlightPopup.appendChild(deleteBtn);
	            }
	        }

	        function positionHighlightPopupNear(rect) {
	            if (!els.highlightPopup || !rect) return;

	            const popupRect = els.highlightPopup.getBoundingClientRect();
            const targetWidth = rect.width || 0;
            const targetLeft = rect.left || 0;
            const popupTop = Math.min(window.innerHeight - popupRect.height - 12, rect.bottom + 10);
            const popupLeft = Math.max(
                12,
                Math.min(
                    window.innerWidth - popupRect.width - 12,
                    targetLeft + targetWidth / 2 - popupRect.width / 2
                )
            );

	            els.highlightPopup.style.top = `${Math.max(12, popupTop)}px`;
	            els.highlightPopup.style.left = `${popupLeft}px`;
	        }

		        function showHighlightPopupForMark(mark) {
		            if (!mark || !els.highlightPopup) return;
		            state.highlightPopupMode = 'mark';
		            state.highlightTargetMark = mark;
		            state.highlightSelectionRange = null;
		            renderHighlightPopup();
		            els.highlightPopup.hidden = false;
		            positionHighlightPopupNear(mark.getBoundingClientRect());
		        }

		        function applyColorToActiveHighlight(color) {
		            if (!state.highlightTargetMark) return;
		            const normalized = normalizeColorValue(color);
		            if (!normalized) return;

		            state.highlightTargetMark.style.backgroundColor = normalized;
		            state.highlightTargetMark.dataset.highlight = 'true';
		            state.highlightTargetMark.dataset.highlightColor = normalized;
		            const editor = state.highlightTargetMark.closest('.text');
		            triggerContentUpdate({ target: editor });
		            showHighlightPopupForMark(state.highlightTargetMark);
		        }

		        function deleteActiveHighlight() {
		            if (!state.highlightTargetMark) return;
		            const editor = state.highlightTargetMark.closest('.text');
		            unwrapElement(state.highlightTargetMark);
		            state.highlightTargetMark = null;
		            state.highlightSelectionRange = null;
		            state.highlightPopupMode = 'hidden';
		            hideHighlightPopup();
		            if (editor) {
		                triggerContentUpdate({ target: editor });
		            }
		        }

	        function renderHighlightPaletteEditor() {
            const list = document.getElementById('highlight-palette-list');
            if (!list) return;

	            list.replaceChildren();
	            state.highlightPalette.forEach((color, index) => {
                const inputValue = colorValueForColorInput(color);
                const row = document.createElement('div');
                row.className = 'palette-row';

                const input = document.createElement('input');
                input.type = 'color';
                input.className = 'palette-color-input';
                input.setAttribute('data-testid', 'palette-color-input');
                input.value = inputValue;
                input.setAttribute('value', inputValue);
	                input.setAttribute('aria-label', `Highlight color ${index + 1}`);
	                input.addEventListener('input', (e) => {
	                    const prevColor = state.highlightPalette[index];
	                    const nextColor = normalizeColorValue(e.target.value) || normalizeColorValue(input.value) || normalizeColorValue(prevColor) || normalizeColorValue(defaultHighlightPalette[0]);
	                    state.highlightPalette[index] = nextColor;
	                    const nextInputValue = colorValueForColorInput(nextColor);
	                    input.value = nextInputValue;
	                    input.setAttribute('value', nextInputValue);
	                    preview.style.backgroundColor = nextColor;
	                    updateAllHighlightsForColor(prevColor, nextColor);
	                    persistHighlightPalette();
	                    renderHighlightPopup();
	                    scheduleAutosave();
	                });

                const preview = document.createElement('div');
                preview.className = 'palette-preview';
                preview.style.backgroundColor = color;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'palette-remove-btn';
                removeBtn.setAttribute('data-testid', 'palette-remove-btn');
                removeBtn.textContent = 'Remove';
	                removeBtn.disabled = state.highlightPalette.length <= 1;
	                removeBtn.addEventListener('click', () => {
	                    if (state.highlightPalette.length <= 1) return;
	                    state.highlightPalette.splice(index, 1);
	                    persistHighlightPalette();
	                    renderHighlightPaletteEditor();
	                    renderHighlightPopup();
	                    refreshHighlightPopup();
	                });

                row.append(input, preview, removeBtn);
                list.appendChild(row);
            });
        }

        function initializeHighlightPalette() {
            let palette = [];
            palette = readStoredHighlightPalette();
            if (palette.length === 0) {
                try {
                    const cached = JSON.parse(localStorage.getItem('highlight-palette') || '[]');
                    if (Array.isArray(cached)) {
                        palette = cached.map((value) => normalizeColorValue(value)).filter(Boolean);
                    }
                } catch (err) {
                    console.warn('Could not read cached highlight palette:', err);
                }
            }
            if (palette.length === 0) {
                palette = [...defaultHighlightPalette];
            }

	            state.highlightPalette = palette;
	            persistHighlightPalette();
	            renderHighlightPaletteEditor();
	            renderHighlightPopup();
	        }

		        function hideHighlightPopup() {
		            if (!els.highlightPopup) return;
		            els.highlightPopup.hidden = true;
		            state.highlightPopupMode = 'hidden';
		            state.highlightSelectionRange = null;
		            state.highlightTargetMark = null;
		        }

        function getClosestElement(node) {
            if (!node) return null;
            return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        }

        function getSelectionTextEditor(selection) {
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

            const anchorEditor = getClosestElement(selection.anchorNode)?.closest('.text');
            const focusEditor = getClosestElement(selection.focusNode)?.closest('.text');
            if (!anchorEditor || !focusEditor || anchorEditor !== focusEditor) return null;
            return anchorEditor;
        }

		        function refreshHighlightPopup() {
		            if (!document.body.classList.contains('is-editing')) {
		                hideHighlightPopup();
		                return;
		            }

		            if (state.highlightPopupMode === 'mark') {
		                if (!state.highlightTargetMark || !state.highlightTargetMark.isConnected) {
		                    hideHighlightPopup();
		                    return;
		                }
		                renderHighlightPopup();
		                els.highlightPopup.hidden = false;
		                positionHighlightPopupNear(state.highlightTargetMark.getBoundingClientRect());
		                return;
		            }

		            const selection = window.getSelection();
		            const editor = getSelectionTextEditor(selection);
		            if (!editor) {
		                hideHighlightPopup();
		                return;
		            }

		            const range = selection.getRangeAt(0);
		            const rect = range.getBoundingClientRect();
		            if (!rect || (!rect.width && !rect.height)) {
		                hideHighlightPopup();
		                return;
		            }

		            state.highlightPopupMode = 'selection';
		            state.highlightTargetMark = null;
		            state.highlightSelectionRange = range.cloneRange();
		            renderHighlightPopup();
		            els.highlightPopup.hidden = false;
		            positionHighlightPopupNear(rect);
		        }

		        function applyHighlight(color) {
		            if (!state.highlightSelectionRange || state.highlightSelectionRange.collapsed) return;

		            state.highlightPopupMode = 'selection';
		            state.highlightTargetMark = null;
		            const editor = getClosestElement(state.highlightSelectionRange.commonAncestorContainer)?.closest('.text');
		            if (!editor) return;

	            const range = state.highlightSelectionRange.cloneRange();
	            const fragment = range.extractContents();
            if (!fragment.textContent || !fragment.textContent.trim()) {
                hideHighlightPopup();
                return;
            }

            const mark = document.createElement('span');
            mark.className = 'highlight-mark';
            mark.setAttribute('data-testid', 'highlight-mark');
	            mark.dataset.highlight = 'true';
	            mark.style.backgroundColor = normalizeColorValue(color);
	            mark.appendChild(fragment);
	            range.insertNode(mark);

            const selection = window.getSelection();
            if (selection) {
                const postRange = document.createRange();
	                postRange.selectNodeContents(mark);
	                selection.removeAllRanges();
	                selection.addRange(postRange);
	                state.highlightSelectionRange = postRange.cloneRange();
	            }

		            triggerContentUpdate({ target: editor });
		            showHighlightPopupForMark(mark);
	        }

        function normalizeBreaksInFragment(fragment) {
            while (fragment.firstChild && fragment.firstChild.nodeName === 'BR') {
                fragment.removeChild(fragment.firstChild);
            }
            while (fragment.lastChild && fragment.lastChild.nodeName === 'BR') {
                fragment.removeChild(fragment.lastChild);
            }
        }

        function sanitizeHtmlToFragment(html) {
            const template = document.createElement('template');
            template.innerHTML = html || '';

            const out = document.createDocumentFragment();
            const blockTags = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);

            function walk(node, parent) {
                if (node.nodeType === Node.TEXT_NODE) {
                    parent.appendChild(document.createTextNode(node.textContent || ''));
                    return;
                }

                if (node.nodeType !== Node.ELEMENT_NODE) return;
                const tag = node.tagName.toUpperCase();

                if (tag === 'BR') {
                    parent.appendChild(document.createElement('br'));
                    return;
                }

                if (tag === 'B' || tag === 'STRONG') {
                    const strong = document.createElement('strong');
                    node.childNodes.forEach((child) => walk(child, strong));
                    if (strong.childNodes.length > 0) parent.appendChild(strong);
                    return;
                }

                if (tag === 'I' || tag === 'EM') {
                    const em = document.createElement('em');
                    node.childNodes.forEach((child) => walk(child, em));
                    if (em.childNodes.length > 0) parent.appendChild(em);
                    return;
                }

                if (tag === 'SPAN') {
                    if (node.classList.contains('search-hit')) {
                        node.childNodes.forEach((child) => walk(child, parent));
                        return;
                    }
                    const highlightColor = normalizeColorValue(node.style.backgroundColor);
                    if (node.dataset.highlight === 'true' || highlightColor) {
                        const span = document.createElement('span');
                        span.className = 'highlight-mark';
                        span.setAttribute('data-testid', 'highlight-mark');
                        span.dataset.highlight = 'true';
                        span.style.backgroundColor = highlightColor || normalizeColorValue(node.getAttribute('data-highlight-color')) || defaultHighlightPalette[0];
                        node.childNodes.forEach((child) => walk(child, span));
                        if (span.childNodes.length > 0) parent.appendChild(span);
                        return;
                    }
                }

                node.childNodes.forEach((child) => walk(child, parent));
                if (blockTags.has(tag)) {
                    parent.appendChild(document.createElement('br'));
                }
            }

            template.content.childNodes.forEach((child) => walk(child, out));
            normalizeBreaksInFragment(out);
            return out;
        }

        function insertPlainText(text) {
            const sanitized = String(text || '').replace(/\r\n/g, '\n');

            const fragment = document.createDocumentFragment();
            sanitized.split('\n').forEach((line, idx) => {
                if (idx > 0) fragment.appendChild(document.createElement('br'));
                fragment.appendChild(document.createTextNode(line));
            });

            insertFragmentAtCursor(fragment);
        }

        function sanitizeTextFormattingInRoot(root) {
            root.querySelectorAll('.text').forEach((el) => {
                const clean = sanitizeHtmlToFragment(el.innerHTML);
                el.replaceChildren(clean);
            });
        }

    return {
        normalizeColorValue,
        colorValueForColorInput,
        updateAllHighlightsForColor,
        persistHighlightPalette,
        renderHighlightPopup,
        renderHighlightPaletteEditor,
        initializeHighlightPalette,
        hideHighlightPopup,
        refreshHighlightPopup,
        showHighlightPopupForMark,
        applyHighlight,
        applyColorToActiveHighlight,
        deleteActiveHighlight,
        sanitizeHtmlToFragment,
        insertPlainText,
        sanitizeTextFormattingInRoot,
    };
}
