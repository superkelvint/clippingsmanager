export function createEditingController({
    state,
    els,
    insertFragmentAtCursor,
    isTextEditorTarget,
    isSubsectionOrSectionTarget,
    sanitizeHtmlToFragment,
    insertPlainText,
    triggerContentUpdate,
    saveNow,
    refreshHighlightPopup,
    hideHighlightPopup,
    showHighlightPopupForMark,
}) {

		        function bindEditingModeListeners() {
		            if (state.editingListenersController) return;
		            const ac = new AbortController();
		            state.editingListenersController = ac;
		            const signal = ac.signal;

	            // Force rich paste/drop content into plain text to prevent structural HTML injection.
	            document.addEventListener('paste', onEditingPaste, { signal });
	            document.addEventListener('drop', onEditingDrop, { signal });
	            document.addEventListener('keydown', onEditingKeydown, { signal });
	            document.addEventListener('selectionchange', onEditingSelectionChange, { signal });
	            document.addEventListener('scroll', onEditingScroll, { signal, capture: true });
	            window.addEventListener('resize', onEditingResize, { signal });
	            document.addEventListener('mousedown', onEditingMouseDown, { signal });
	            document.addEventListener('click', onEditingClick, { signal });
		        }

		        function unbindEditingModeListeners() {
		            if (!state.editingListenersController) return;
		            state.editingListenersController.abort();
		            state.editingListenersController = null;
		        }

		        function onEditingPaste(e) {
		            if (!document.body.classList.contains('is-editing')) return;
		            const editableTarget = e.target.closest('[contenteditable="true"]');
		            if (!editableTarget) return;

		            e.preventDefault();
		            if (isTextEditorTarget(editableTarget)) {
		                const html = (e.clipboardData || window.clipboardData).getData('text/html');
		                if (html) {
		                    insertFragmentAtCursor(sanitizeHtmlToFragment(html));
		                } else {
		                    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
		                    insertPlainText(text);
		                }
		            } else {
		                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
		                insertPlainText(text);
		            }
		            triggerContentUpdate({ target: editableTarget });
		        }

		        function onEditingDrop(e) {
		            if (!document.body.classList.contains('is-editing')) return;
		            if (state.tocDragState) return; // preserve TOC drag-and-drop behavior

		            const editableTarget = e.target.closest('[contenteditable="true"]');
		            if (!editableTarget) return;

		            e.preventDefault();
		            editableTarget.focus();
		            if (isTextEditorTarget(editableTarget)) {
		                const html = (e.dataTransfer && e.dataTransfer.getData('text/html')) || '';
		                if (html) {
		                    insertFragmentAtCursor(sanitizeHtmlToFragment(html));
		                } else {
		                    const text = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || '';
		                    insertPlainText(text);
		                }
		            } else {
		                const text = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || '';
		                insertPlainText(text);
		            }
		            triggerContentUpdate({ target: editableTarget });
		        }

		        function onEditingKeydown(e) {
		            if (!document.body.classList.contains('is-editing')) return;
		            const editableTarget = e.target.closest('[contenteditable="true"]');
		            if (!editableTarget) return;

		            const isMod = e.ctrlKey || e.metaKey;
		            if (isMod && !e.shiftKey && !e.altKey) {
		                const key = e.key.toLowerCase();
		                if (key === 's') {
		                    e.preventDefault();
		                    if (!state.fileHandle) return;
		                    saveNow();
		                    return;
		                }

		                if (key === 'b' || key === 'i') {
		                    e.preventDefault();
		                    if (!isTextEditorTarget(editableTarget)) return;

		                    document.execCommand(key === 'b' ? 'bold' : 'italic', false, null);
		                    triggerContentUpdate({ target: editableTarget });
		                    return;
		                }
		            }

		            if (e.key === 'Enter' && isTextEditorTarget(editableTarget)) {
		                e.preventDefault();
		                insertFragmentAtCursor(document.createElement('br'));
		                triggerContentUpdate({ target: editableTarget });
		                return;
		            }

		            if (e.key === 'Enter' && isSubsectionOrSectionTarget(editableTarget)) {
		                e.preventDefault();
		                editableTarget.blur();
		                triggerContentUpdate({ target: editableTarget });
		            }
		        }

		        function onEditingSelectionChange() {
		            window.requestAnimationFrame(refreshHighlightPopup);
		        }

		        function onEditingScroll() {
		            hideHighlightPopup();
		        }

		        function onEditingResize() {
		            refreshHighlightPopup();
		        }

		        function onEditingMouseDown(e) {
		            if (els.highlightPopup && els.highlightPopup.contains(e.target)) return;
		            if (e.target.closest('#highlight-panel')) return;
		            if (e.target.closest('#highlight-toggle-btn')) return;
		            const mark = e.target.closest('.highlight-mark');
		            if (mark && document.body.classList.contains('is-editing')) {
		                state.highlightPopupMode = 'mark';
		                state.highlightTargetMark = mark;
		                return;
		            }
		            const editor = e.target.closest('.text');
		            if (!editor) {
		                hideHighlightPopup();
		                return;
		            }
		            if (state.highlightPopupMode === 'mark') {
		                hideHighlightPopup();
		            }
		        }

		        function onEditingClick(e) {
		            if (!document.body.classList.contains('is-editing')) return;
		            if (els.highlightPopup && els.highlightPopup.contains(e.target)) return;
		            const mark = e.target.closest('.highlight-mark');
		            if (!mark) return;
		            showHighlightPopupForMark(mark);
		        }

    return { bindEditingModeListeners, unbindEditingModeListeners };
}
