
import { createFileSession } from './file-session.js';
import { createDocumentDom } from './document-dom.js';
import { createToc } from './toc.js';
import { createSearchTags } from './search-tags.js';
import { createHighlights } from './highlights.js';

	        const els = {
	            status: document.getElementById('save-status'),
	            helpModal: document.getElementById('help-modal'),
	            resetModal: document.getElementById('reset-modal'),
	            updateModal: document.getElementById('update-modal'),
	            updateCurrentSha: document.getElementById('update-current-sha'),
	            updateLatestSha: document.getElementById('update-latest-sha'),
	            updateChangelog: document.getElementById('update-changelog'),
	            updateChangelogTitle: document.getElementById('update-changelog-title'),
	            updateChangelogList: document.getElementById('update-changelog-list'),
		            updateNowBtn: document.getElementById('update-now-btn'),
		            updateNotNowBtn: document.getElementById('update-not-now-btn'),
                    moveEntryModal: document.getElementById('move-entry-modal'),
                    moveEntryTargetList: document.getElementById('move-entry-target-list'),
                    moveEntryTargetName: document.getElementById('move-entry-target-name'),
                    confirmMoveEntryBtn: document.getElementById('confirm-move-entry-btn'),
		            highlightPopup: document.getElementById('highlight-popup'),
	            highlightPaletteData: document.getElementById('highlight-palette-data'),
	            highlightPanel: document.getElementById('highlight-panel'),
	            highlightToggleBtn: document.getElementById('highlight-toggle-btn'),
	            entrySearch: document.getElementById('entry-search'),
                knownTagOptions: document.getElementById('known-tag-options'),
                    searchTagFilters: document.getElementById('search-tag-filters'),
                    searchTagFiltersHelp: document.getElementById('search-tag-filters-help'),
                    tocFab: document.getElementById('toc-fab'),
                    tocDrawer: document.getElementById('toc-drawer'),
                    tocDrawerClose: document.getElementById('toc-drawer-close'),
                    tocDrawerBackdrop: document.querySelector('.toc-drawer-backdrop'),
                    tocDrawerList: document.getElementById('toc-drawer-list'),
                    tocContainer: document.getElementById('toc-container'),
	        };

		        const state = {
		            fileHandle: null,
		            saveTimeout: null,
		            saveInProgress: false,
		            pendingSave: false,
		            baseListenersBound: false,
		            editingListenersController: null,
		            tocIncludeEntries: false,
		            isUnsupportedBrowser: false,
		            resetExpectedTitle: '',
		            highlightPalette: [],
		            highlightPopupMode: 'hidden', // 'hidden' | 'selection' | 'mark'
		            highlightSelectionRange: null,
		            highlightTargetMark: null,
		            tocDragState: null,
		            tocRegenRaf: null,
		            updateCandidateSha: '',
		            updateCandidateHtml: '',
		            updateCandidateCommitSha: '',
		            updateCandidateIgnoreToken: '',
                    updateCheckAttempted: false,
                    knownTags: [],
                    knownTagColorMap: new Map(),
                    selectedSearchTagKeys: [],
                    selectedSearchTagMode: 'any',
                    moveEntryContext: null,

	            editLockKey: null,
	            editLockHeartbeat: null,
	            editLockChannel: null,
	            editLockDisabled: false,
                    editLockWebHeld: false,
                    editLockWebRelease: null,
                    editLockWebToken: null,
	        };

        const editableSelector = '[contenteditable]';
        const containerSelector = '.section, .subsection-group';
        const defaultHighlightPalette = ['#facc15', '#86efac', '#93c5fd'];
        const defaultTagPalette = [
            { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', removeBg: '#fde68a', removeText: '#78350f' },
            { bg: '#fee2e2', border: '#f87171', text: '#991b1b', removeBg: '#fecaca', removeText: '#7f1d1d' },
            { bg: '#ffedd5', border: '#fb923c', text: '#9a3412', removeBg: '#fed7aa', removeText: '#7c2d12' },
            { bg: '#fef9c3', border: '#eab308', text: '#854d0e', removeBg: '#fde68a', removeText: '#713f12' },
            { bg: '#ecfccb', border: '#84cc16', text: '#3f6212', removeBg: '#d9f99d', removeText: '#365314' },
            { bg: '#dcfce7', border: '#4ade80', text: '#166534', removeBg: '#bbf7d0', removeText: '#14532d' },
            { bg: '#ccfbf1', border: '#2dd4bf', text: '#115e59', removeBg: '#99f6e4', removeText: '#134e4a' },
            { bg: '#cffafe', border: '#22d3ee', text: '#155e75', removeBg: '#a5f3fc', removeText: '#164e63' },
            { bg: '#dbeafe', border: '#60a5fa', text: '#1d4ed8', removeBg: '#bfdbfe', removeText: '#1e3a8a' },
            { bg: '#e0e7ff', border: '#818cf8', text: '#4338ca', removeBg: '#c7d2fe', removeText: '#3730a3' },
            { bg: '#ede9fe', border: '#a78bfa', text: '#6d28d9', removeBg: '#ddd6fe', removeText: '#5b21b6' },
            { bg: '#f5f3ff', border: '#c4b5fd', text: '#7c3aed', removeBg: '#e9d5ff', removeText: '#6b21a8' },
            { bg: '#fae8ff', border: '#e879f9', text: '#a21caf', removeBg: '#f5d0fe', removeText: '#86198f' },
            { bg: '#fdf2f8', border: '#f472b6', text: '#be185d', removeBg: '#fbcfe8', removeText: '#9d174d' },
            { bg: '#ffe4e6', border: '#fb7185', text: '#be123c', removeBg: '#fecdd3', removeText: '#9f1239' },
            { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', removeBg: '#fee2e2', removeText: '#991b1b' },
            { bg: '#fff7ed', border: '#fdba74', text: '#c2410c', removeBg: '#fed7aa', removeText: '#9a3412' },
            { bg: '#fefce8', border: '#facc15', text: '#a16207', removeBg: '#fde68a', removeText: '#854d0e' },
            { bg: '#f7fee7', border: '#a3e635', text: '#4d7c0f', removeBg: '#d9f99d', removeText: '#3f6212' },
            { bg: '#f0fdf4', border: '#86efac', text: '#15803d', removeBg: '#bbf7d0', removeText: '#166534' },
            { bg: '#ecfdf5', border: '#6ee7b7', text: '#047857', removeBg: '#a7f3d0', removeText: '#065f46' },
            { bg: '#f0fdfa', border: '#5eead4', text: '#0f766e', removeBg: '#99f6e4', removeText: '#115e59' },
            { bg: '#ecfeff', border: '#67e8f9', text: '#0e7490', removeBg: '#a5f3fc', removeText: '#155e75' },
            { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb', removeBg: '#bfdbfe', removeText: '#1d4ed8' },
            { bg: '#eef2ff', border: '#a5b4fc', text: '#4f46e5', removeBg: '#c7d2fe', removeText: '#4338ca' },
            { bg: '#f5f3ff', border: '#c4b5fd', text: '#7c3aed', removeBg: '#ddd6fe', removeText: '#6d28d9' },
            { bg: '#faf5ff', border: '#d8b4fe', text: '#9333ea', removeBg: '#e9d5ff', removeText: '#7e22ce' },
            { bg: '#fdf4ff', border: '#f0abfc', text: '#a21caf', removeBg: '#f5d0fe', removeText: '#86198f' },
            { bg: '#fff1f2', border: '#fda4af', text: '#e11d48', removeBg: '#fecdd3', removeText: '#be123c' },
            { bg: '#f8fafc', border: '#94a3b8', text: '#334155', removeBg: '#e2e8f0', removeText: '#1e293b' }
        ];
        const tagPaletteOrder = [0, 8, 16, 24, 4, 12, 20, 28, 2, 10, 18, 26, 6, 14, 22, 29, 1, 9, 17, 25, 5, 13, 21, 27, 3, 11, 19, 23, 7, 15];
        const searchTags = createSearchTags({
            state,
            els,
            defaultHighlightPalette,
            defaultTagPalette,
            tagPaletteOrder,
            clearSearchDecorations,
            getDirectChildEntries: (...args) => getDirectChildEntries(...args),
            getDirectChildContainers: (...args) => getDirectChildContainers(...args),
            syncEntryMoveButtons: (...args) => syncEntryMoveButtons(...args),
            triggerStructureUpdate: (...args) => triggerStructureUpdate(...args),
        });
        const {
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
        } = searchTags;
        const documentDom = createDocumentDom({
            containerSelector,
            createAddButton: (...args) => createAddButton(...args),
            createDeleteButton: (...args) => createDeleteButton(...args),
            enhanceEntries: (...args) => enhanceEntries(...args),
        });
        const {
            isContainerNode,
            getDirectChildEntries,
            getDirectChildContainers,
            getContainerTitleText,
            ensureContainerDomId,
            ensureDomId,
            removeLegacyContentDragHandles,
            syncContainerCollapseState,
            normalizeDocument,
        } = documentDom;
        const { generateTOC } = createToc({
            state,
            els,
            isContainerNode,
            getDirectChildContainers,
            getContainerTitleText,
            ensureContainerDomId,
            ensureDomId,
        });
        const highlights = createHighlights({
            state,
            els,
            defaultHighlightPalette,
            insertFragmentAtCursor: (...args) => insertFragmentAtCursor(...args),
            triggerContentUpdate: (...args) => triggerContentUpdate(...args),
            scheduleAutosave: (...args) => scheduleAutosave(...args),
            unwrapElement: (...args) => unwrapElement(...args),
        });
        const {
            normalizeColorValue,
            colorValueForColorInput,
            updateAllHighlightsForColor,
            persistHighlightPalette,
            renderHighlightPopup,
            renderHighlightPaletteEditor,
            initializeHighlightPalette,
            hideHighlightPopup,
            refreshHighlightPopup,
            applyHighlight,
            applyColorToActiveHighlight,
            deleteActiveHighlight,
            sanitizeHtmlToFragment,
            insertPlainText,
            sanitizeTextFormattingInRoot,
        } = highlights;
        const UPDATE_IGNORE_SHA_KEY = 'clippings-update-ignore-sha';
        const LAST_UPDATED_COMMIT_KEY = 'clippings-last-updated-commit';
        function getMetaContent(name) {
            const el = document.querySelector(`meta[name="${name}"]`);
            return el && el.content ? String(el.content).trim() : '';
        }

        function getBuildShaFromDom(doc = document) {
            try {
                const el = doc.querySelector('meta[name="clippings-build-sha"]');
                return el && el.content ? String(el.content).trim() : '';
            } catch {
                return '';
            }
        }

        function getUpstreamHtmlUrlFromDom() {
            return getMetaContent('clippings-upstream-html');
        }

        function getUpstreamCommitsApiUrlFromDom() {
            return getMetaContent('clippings-upstream-commits-api');
        }

        function getUpstreamCompareApiPrefixFromDom() {
            return getMetaContent('clippings-upstream-compare-api-prefix');
        }

        function getTemplateCommitFromDom() {
            const sha = getMetaContent('clippings-template-commit');
            return isLikelyCommitSha(sha) ? sha : '';
        }

        function shortSha(sha) {
            const s = (sha || '').trim();
            return s.length > 10 ? s.slice(0, 10) : (s || 'unknown');
        }

        function isLikelyCommitSha(value) {
            const s = String(value || '').trim();
            if (!s) return false;
            // Allow short SHAs too.
            return /^[0-9a-f]{7,40}$/i.test(s);
        }

        function getLastUpdatedCommitSha() {
            try {
                return (localStorage.getItem(LAST_UPDATED_COMMIT_KEY) || '').trim();
            } catch {
                return '';
            }
        }

        function setLastUpdatedCommitSha(sha) {
            try {
                localStorage.setItem(LAST_UPDATED_COMMIT_KEY, String(sha || '').trim());
            } catch {}
        }

        function getIgnoredUpdateSha() {
            try {
                return (localStorage.getItem(UPDATE_IGNORE_SHA_KEY) || '').trim();
            } catch {
                return '';
            }
        }

        function ignoreUpdateSha(sha) {
            try {
                localStorage.setItem(UPDATE_IGNORE_SHA_KEY, String(sha || '').trim());
            } catch {}
        }

        function closeUpdateModal() {
            if (!els.updateModal) return;
            els.updateModal.setAttribute('hidden', '');
        }

        function openUpdateModal({ currentSha, latestSha }) {
            if (!els.updateModal) return;
            if (els.updateCurrentSha) els.updateCurrentSha.textContent = shortSha(currentSha);
            if (els.updateLatestSha) els.updateLatestSha.textContent = shortSha(latestSha);
            if (els.updateChangelog) els.updateChangelog.setAttribute('hidden', '');
            els.updateModal.removeAttribute('hidden');
        }

        async function fetchTextWithTimeout(url, timeoutMs = 9000) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.text();
            } finally {
                clearTimeout(timeout);
            }
        }

        async function fetchJsonWithTimeout(url, timeoutMs = 9000) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(url, {
                    cache: 'no-store',
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/vnd.github+json'
                    }
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } finally {
                clearTimeout(timeout);
            }
        }

        function renderUpdateChangelog(commits, { title }) {
            if (!els.updateChangelog || !els.updateChangelogList) return;
            if (!Array.isArray(commits) || commits.length === 0) return;

            const items = [];
            for (const c of commits) {
                const sha = (c && c.sha) ? String(c.sha).trim() : '';
                const msg = c && c.commit && c.commit.message ? String(c.commit.message) : '';
                const firstLine = msg.split('\n')[0].trim();
                if (!sha || !firstLine) continue;
                items.push({ sha, message: firstLine });
            }
            if (items.length === 0) return;

            const toShow = items.slice(0, 12);
            if (toShow.length === 0) return;

            if (els.updateChangelogTitle && title) {
                els.updateChangelogTitle.textContent = String(title);
            }

            els.updateChangelogList.innerHTML = '';
            for (const c of toShow) {
                const li = document.createElement('li');
                const code = document.createElement('code');
                code.textContent = shortSha(c.sha);
                const text = document.createTextNode(` ${c.message}`);
                li.appendChild(code);
                li.appendChild(text);
                els.updateChangelogList.appendChild(li);
            }

            els.updateChangelog.removeAttribute('hidden');
        }

        function extractBuildShaFromHtml(htmlText) {
            try {
                const doc = new DOMParser().parseFromString(String(htmlText || ''), 'text/html');
                return getBuildShaFromDom(doc);
            } catch {
                return '';
            }
        }

        function mergeUserContentIntoTemplate({ currentHtml, upstreamHtml }) {
            const currentDoc = new DOMParser().parseFromString(String(currentHtml || ''), 'text/html');
            const upstreamDoc = new DOMParser().parseFromString(String(upstreamHtml || ''), 'text/html');

            const currentTitle = currentDoc.getElementById('main-title');
            const currentRoot = currentDoc.getElementById('app-root');
            const currentPalette = currentDoc.getElementById('highlight-palette-data');
            const currentDocId = currentDoc.querySelector('meta[name="clippings-doc-id"]');
            const currentDocumentTitle = currentDoc.querySelector('title');

            const upstreamTitle = upstreamDoc.getElementById('main-title');
            const upstreamRoot = upstreamDoc.getElementById('app-root');
            const upstreamPalette = upstreamDoc.getElementById('highlight-palette-data');
            const upstreamDocumentTitle = upstreamDoc.querySelector('title');

            if (!upstreamTitle || !upstreamRoot) {
                throw new Error('Upstream template is missing required elements (#main-title or #app-root).');
            }
            if (!currentTitle || !currentRoot) {
                throw new Error('Current document is missing required elements (#main-title or #app-root).');
            }

            upstreamTitle.textContent = currentTitle.textContent || '';
            upstreamRoot.innerHTML = currentRoot.innerHTML;
            if (currentDocumentTitle && upstreamDocumentTitle) {
                upstreamDocumentTitle.textContent = currentDocumentTitle.textContent || 'Clippings Manager';
            }

            if (upstreamPalette && currentPalette) {
                upstreamPalette.textContent = currentPalette.textContent || '[]';
            }

            if (currentDocId && currentDocId.content) {
                let upstreamDocId = upstreamDoc.querySelector('meta[name="clippings-doc-id"]');
                if (!upstreamDocId) {
                    upstreamDocId = upstreamDoc.createElement('meta');
                    upstreamDocId.setAttribute('name', 'clippings-doc-id');
                    (upstreamDoc.head || upstreamDoc.documentElement).appendChild(upstreamDocId);
                }
                upstreamDocId.setAttribute('content', String(currentDocId.content).trim());
            }

            return '<!DOCTYPE html>\n' + upstreamDoc.documentElement.outerHTML;
        }

        async function maybePromptForUpdate() {
            if (state.isUnsupportedBrowser) return;
            // Playwright/WebDriver runs should never hit the network for update checks; it slows tests
            // and can fail in sandboxed environments. Self-update tests can opt-in explicitly.
            const isWebDriver = !!(navigator && navigator.webdriver);
            if (isWebDriver && !(window && window.__clippings_test_enable_update_check)) return;
            const upstreamUrl = getUpstreamHtmlUrlFromDom();
            if (!upstreamUrl) return;

            const currentBuildId = getBuildShaFromDom();
            let upstreamHtml = '';
            try {
                upstreamHtml = await fetchTextWithTimeout(upstreamUrl);
            } catch {
                return;
            }

            const latestBuildId = extractBuildShaFromHtml(upstreamHtml);
            if (!latestBuildId) return;
            if (latestBuildId === currentBuildId) return;

            state.updateCandidateSha = latestBuildId;
            state.updateCandidateHtml = upstreamHtml;

            // Fetch commit log between the current template commit and the latest commit.
            const commitsApiUrl = getUpstreamCommitsApiUrlFromDom();
            const comparePrefix = getUpstreamCompareApiPrefixFromDom();
            const storedBase = getLastUpdatedCommitSha();
            const baseCommitSha = getTemplateCommitFromDom() || (isLikelyCommitSha(storedBase) ? storedBase : '');
            let latestCommitSha = '';
            if (commitsApiUrl) {
                try {
                    const commits = await fetchJsonWithTimeout(commitsApiUrl, 6000);
                    const head = commits && commits[0] && commits[0].sha ? String(commits[0].sha).trim() : '';
                    latestCommitSha = isLikelyCommitSha(head) ? head : '';
                } catch {}
            }
            state.updateCandidateCommitSha = latestCommitSha;

            const ignoreToken = latestCommitSha || latestBuildId;
            state.updateCandidateIgnoreToken = ignoreToken;
            if (getIgnoredUpdateSha() === ignoreToken) return;

            // Display commit SHAs if available; fall back to build ids.
            const displayCurrent = baseCommitSha || currentBuildId;
            const displayLatest = latestCommitSha || latestBuildId;
            openUpdateModal({ currentSha: displayCurrent, latestSha: displayLatest });

            if (comparePrefix && baseCommitSha && latestCommitSha && baseCommitSha !== latestCommitSha) {
                try {
                    const compareUrl = `${comparePrefix}${encodeURIComponent(baseCommitSha)}...${encodeURIComponent(latestCommitSha)}`;
                    const compare = await fetchJsonWithTimeout(compareUrl, 6000);
                    if (compare && Array.isArray(compare.commits) && compare.commits.length) {
                        // GitHub returns commits oldest->newest; show newest first.
                        renderUpdateChangelog(compare.commits.slice().reverse(), {
                            title: 'What changed since your version'
                        });
                    }
                } catch {}
            }
        }

        async function maybePromptForUpdateOnce() {
            if (state.updateCheckAttempted) return;
            state.updateCheckAttempted = true;
            await maybePromptForUpdate();
        }

        async function runSelfUpdate() {
            if (!state.updateCandidateSha || !state.updateCandidateHtml) return;

            const latestSha = state.updateCandidateSha;
            const latestCommitSha = state.updateCandidateCommitSha;
            closeUpdateModal();
            els.status.textContent = 'Updating template...';

            let lockOk = true;
            let acquiredForUpdate = false;
            try {
                if (!state.fileHandle) {
                    const pickerOptions = {
                        id: 'clippings-open-file-for-update',
                        types: [{ description: 'HTML File', accept: { 'text/html': ['.html'] } }],
                        multiple: false
                    };
                    [state.fileHandle] = await window.showOpenFilePicker(pickerOptions);
                }

                if (!fileSession.hasEditLock()) {
                    lockOk = await fileSession.acquire(state.fileHandle);
                    acquiredForUpdate = lockOk;
                }
                if (!lockOk || !fileSession.hasEditLock()) return;

                const currentSavableHtml = buildSavableHtml();
                const merged = mergeUserContentIntoTemplate({
                    currentHtml: currentSavableHtml,
                    upstreamHtml: state.updateCandidateHtml
                });

                if (!fileSession.hasEditLock()) return;
                const updateHandle = state.fileHandle;
                const updateLockKey = state.editLockKey;
                const writable = await updateHandle.createWritable();
                if (state.fileHandle !== updateHandle || state.editLockKey !== updateLockKey || !fileSession.hasEditLock()) {
                    if (typeof writable.abort === 'function') await writable.abort();
                    return;
                }
                await writable.write(merged);
                if (state.fileHandle !== updateHandle || state.editLockKey !== updateLockKey || !fileSession.hasEditLock()) {
                    if (typeof writable.abort === 'function') await writable.abort();
                    return;
                }
                await writable.close();

                if (latestCommitSha) {
                    setLastUpdatedCommitSha(latestCommitSha);
                }

                els.status.textContent = `Updated to ${shortSha(latestSha)}. Reloading...`;
                const disableReload = !!(window && window.__clippings_test_disable_reload);
                if (!disableReload) {
                    try { window.location.reload(); } catch {}
                }
            } catch (err) {
                console.error('Update failed:', err);
                els.status.textContent = 'Update failed (see console).';
            } finally {
                if (acquiredForUpdate) {
                    try { fileSession.release(); } catch {}
                }
            }
        }

	        function scheduleGenerateTOC() {
	            if (state.tocRegenRaf) return;
	            state.tocRegenRaf = window.requestAnimationFrame(() => {
	                state.tocRegenRaf = null;
	                generateTOC();
	            });
	        }


	        function setEditingMode(isEditing) {
	            document.body.classList.toggle('is-editing', isEditing);
	            document.querySelectorAll(editableSelector).forEach((el) => {
	                el.setAttribute('contenteditable', isEditing ? 'true' : 'false');
	            });
                if (!isEditing) {
                    document.querySelectorAll('.entry').forEach((entry) => setEntryTagEditMode(entry, false, { clearDraft: true }));
                }
                syncTagControls(document);
	            if (isEditing) {
	                bindEditingModeListeners();
	            } else {
	                unbindEditingModeListeners();
	                hideHighlightPopup();
	                setHighlightPanelOpen(false);
                    closeMoveEntryModal();
	            }
		            if (!isEditing) {
		                clearTimeout(state.saveTimeout);
		                state.pendingSave = false;
		            }
	            const editBtn = document.getElementById('enable-edit-btn');
	            if (editBtn) editBtn.textContent = isEditing ? 'Exit Editing' : 'Enable Editing';
	            const resetBtn = document.getElementById('reset-btn');
	            if (resetBtn) resetBtn.hidden = !isEditing;
	            els.status.textContent = isEditing ? 'Editing Enabled - Auto-saving...' : 'Read-Only Mode';
	        }

        const fileSession = createFileSession({
            state,
            getDocumentTitle: () => document.title,
            isEditing: () => document.body.classList.contains('is-editing'),
            onLostLock: () => setEditingMode(false),
            setStatusText: (text) => { els.status.textContent = text; },
        });

	        function setHighlightPanelOpen(isOpen) {
	            if (!els.highlightPanel || !els.highlightToggleBtn) return;
	            els.highlightPanel.hidden = !isOpen;
	            els.highlightToggleBtn.textContent = isOpen ? 'Hide Highlights' : 'Highlight Colors';
	        }

        function updateTocToggleLabel() {
	            const btn = document.getElementById('toc-level-btn');
	            if (!btn) return;
	            btn.textContent = state.tocIncludeEntries ? 'Hide Entries' : 'Show Entries';
	        }

        function setTocDrawerOpen(isOpen) {
            if (!els.tocDrawer || !els.tocFab) return;
            els.tocDrawer.hidden = !isOpen;
            els.tocFab.setAttribute('aria-expanded', String(isOpen));
            document.body.classList.toggle('toc-drawer-open', isOpen);
            if (isOpen && els.tocDrawerClose) els.tocDrawerClose.focus();
            if (!isOpen) els.tocFab.focus();
        }

        function closeTocDrawer() {
            if (els.tocDrawer && !els.tocDrawer.hidden) setTocDrawerOpen(false);
        }

        function observeInlineToc() {
            if (!els.tocContainer || typeof IntersectionObserver !== 'function') {
                document.body.classList.add('toc-past-inline');
                return;
            }
            const observer = new IntersectionObserver(([entry]) => {
                document.body.classList.toggle('toc-past-inline', !entry.isIntersecting);
            }, { threshold: 0 });
            observer.observe(els.tocContainer);
        }

        function expandTocTarget(target) {
            if (!target) return false;
            let changed = false;
            let container = target.closest(containerSelector);
            while (container) {
                if (container.dataset.collapsed === 'true') {
                    container.dataset.collapsed = 'false';
                    syncContainerCollapseState(container);
                    changed = true;
                }
                container = container.parentElement?.closest(containerSelector) || null;
            }
            if (changed && document.body.classList.contains('is-editing')) {
                triggerStructureUpdate();
            }
            return changed;
        }

	        function openHelp() {
	            if (!els.helpModal) return;
	            els.helpModal.hidden = false;
	        }

	        function closeHelp() {
	            if (!els.helpModal) return;
	            els.helpModal.hidden = true;
	        }

        function unwrapElement(el) {
            if (!el || !el.parentNode) return;
            const parent = el.parentNode;
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
        }

        function clearSearchDecorations(root = document) {
            root.querySelectorAll('.search-hit').forEach((el) => unwrapElement(el));
            root.normalize();
        }


	        function getPageTitleText() {
	            const titleText = (document.getElementById('main-title').textContent || '').trim();
	            return titleText || 'Untitled Document';
	        }

	        function openResetModal() {
	            if (!state.fileHandle) {
	                els.status.textContent = 'Enable Editing first to connect a file';
	                return;
	            }

            const requiredTitleEl = document.getElementById('reset-required-title');
            const confirmInputEl = document.getElementById('reset-confirm-input');
            const confirmBtnEl = document.getElementById('confirm-reset-btn');
	            state.resetExpectedTitle = getPageTitleText();

	            requiredTitleEl.textContent = state.resetExpectedTitle;
	            confirmInputEl.value = '';
	            confirmBtnEl.disabled = true;
	            els.resetModal.hidden = false;
	            confirmInputEl.focus();
	        }

	        function closeResetModal() {
	            if (!els.resetModal) return;
	            els.resetModal.hidden = true;
	        }

	        function updateResetConfirmState() {
	            const entered = document.getElementById('reset-confirm-input').value.trim();
	            document.getElementById('confirm-reset-btn').disabled = entered !== state.resetExpectedTitle;
	        }

	        function resetDocumentNow() {
	            if (state.editLockDisabled || !fileSession.hasEditLock()) {
                closeResetModal();
                els.status.textContent = 'Reset blocked: this tab does not hold the file lock';
                return;
            }
	            document.getElementById('main-title').textContent = 'Clippings Manager';
	            document.title = 'Clippings Manager';
	            document.getElementById('app-root').replaceChildren();
                refreshKnownTags(document.getElementById('app-root'));
	            closeResetModal();
	            triggerStructureUpdate();
	        }

        function getContainerInsertAnchor(container, preferredSelector = '.add-entry', position = 'end') {
            if (!isContainerNode(container)) return null;
            if (position === 'start') {
                return container.querySelector(':scope > .entry') ||
                    container.querySelector(':scope > .subsection-group') ||
                    container.querySelector(':scope > .add-entry:not(.add-entry-top)') ||
                    container.querySelector(':scope > .add-entry');
            }
            return container.querySelector(`:scope > ${preferredSelector}`) ||
                container.querySelector(':scope > .add-subsection') ||
                container.querySelector(':scope > .add-entry');
        }

        function collectMoveTargetContainers(parent, depth, pathTitles, out) {
            getDirectChildContainers(parent).forEach((container) => {
                const id = ensureContainerDomId(container);
                const title = getContainerTitleText(container);
                const nextPath = [...pathTitles, title];
                out.push({ id, depth, path: nextPath.join(' / ') });
                collectMoveTargetContainers(container, depth + 1, nextPath, out);
            });
        }

        function closeMoveEntryModal() {
            if (!els.moveEntryModal) return;
            els.moveEntryModal.hidden = true;
            state.moveEntryContext = null;
            if (els.moveEntryTargetList) {
                els.moveEntryTargetList.replaceChildren();
            }
            if (els.moveEntryTargetName) {
                els.moveEntryTargetName.textContent = 'No destination selected';
            }
            if (els.confirmMoveEntryBtn) {
                els.confirmMoveEntryBtn.disabled = true;
            }
        }

        function updateMoveEntryConfirmState() {
            if (!els.confirmMoveEntryBtn || !els.moveEntryTargetName) return;
            const context = state.moveEntryContext;
            if (!context || !context.targetId) {
                els.confirmMoveEntryBtn.disabled = true;
                els.moveEntryTargetName.textContent = 'No destination selected';
                return;
            }

            const selected = context.targets.find((target) => target.id === context.targetId);
            if (!selected) {
                els.confirmMoveEntryBtn.disabled = true;
                els.moveEntryTargetName.textContent = 'No destination selected';
                return;
            }

            els.confirmMoveEntryBtn.disabled = false;
            els.moveEntryTargetName.textContent = selected.path;
        }

        function renderMoveEntryTargetList() {
            if (!els.moveEntryTargetList) return;
            els.moveEntryTargetList.replaceChildren();
            const context = state.moveEntryContext;
            if (!context || context.targets.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'move-entry-empty';
                empty.textContent = 'No other destination is available.';
                els.moveEntryTargetList.appendChild(empty);
                updateMoveEntryConfirmState();
                return;
            }

            context.targets.forEach((target) => {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'move-entry-target-option';
                option.setAttribute('data-testid', 'move-entry-target-option');
                option.dataset.targetId = target.id;
                option.dataset.depth = String(target.depth);
                option.style.setProperty('--target-depth', String(target.depth));
                option.textContent = target.path;
                if (context.targetId === target.id) {
                    option.dataset.selected = 'true';
                }
                els.moveEntryTargetList.appendChild(option);
            });
            updateMoveEntryConfirmState();
        }

        function openMoveEntryModal(entry) {
            if (!entry || !els.moveEntryModal || !els.moveEntryTargetList) return;
            const entryId = ensureDomId(entry, 'entry');
            const currentParent = entry.parentElement;
            if (!entryId || !isContainerNode(currentParent)) return;

            const currentParentId = ensureContainerDomId(currentParent);
            const allTargets = [];
            collectMoveTargetContainers(document.getElementById('app-root'), 0, [], allTargets);
            const targets = allTargets.filter((target) => target.id !== currentParentId);
            state.moveEntryContext = {
                entryId,
                targets,
                targetId: targets[0] ? targets[0].id : '',
            };
            renderMoveEntryTargetList();
            els.moveEntryModal.hidden = false;
        }

        function moveEntryToSelectedTarget() {
            const context = state.moveEntryContext;
            if (!context || !context.entryId || !context.targetId) return;
            const entry = document.getElementById(context.entryId);
            const targetContainer = document.getElementById(context.targetId);
            if (!entry || !targetContainer || !isContainerNode(targetContainer)) return;
            if (entry.parentElement === targetContainer) return;

            const insertAnchor = getContainerInsertAnchor(targetContainer, '.add-entry');
            if (insertAnchor) {
                targetContainer.insertBefore(entry, insertAnchor);
            } else {
                targetContainer.appendChild(entry);
            }
            closeMoveEntryModal();
            triggerStructureUpdate();
        }

        function insertFragmentAtCursor(fragment) {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            range.deleteContents();
            const nodeToInsert = fragment;
            const isFragment = nodeToInsert.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
            const lastNode = isFragment ? nodeToInsert.lastChild : nodeToInsert;
            range.insertNode(nodeToInsert);

            if (!lastNode) return;
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        function isTextEditorTarget(node) {
            return !!(node && node.classList && node.classList.contains('text'));
        }

        function isSubsectionOrSectionTarget(node) {
            return !!(node && node.classList && (node.classList.contains('subsection-title') || node.classList.contains('section-title')));
        }


	        function saveNow() {
	            clearTimeout(state.saveTimeout);
	            autoTitle();
	            generateTOC();
	            els.status.textContent = 'Saving...';
	            saveToDisk();
	        }

        function focusEditableAtEnd(el) {
            if (!el) return;
            el.focus();

            const selection = window.getSelection();
            if (!selection) return;
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

	        function bindBaseListeners() {
	            if (state.baseListenersBound) return;
	            state.baseListenersBound = true;
	            document.addEventListener('pointerdown', (e) => {
	                if (!e.target.closest('.section-menu, .section-menu-toggle')) {
	                    closeSectionMenus();
	                }
	            }, true);

                    const appRoot = document.getElementById('app-root');
		            appRoot.addEventListener('input', (e) => {
                        if (e.target && e.target.classList && e.target.classList.contains('entry-tag-input')) {
                            return;
                        }
                        triggerContentUpdate(e);
                    });
                    appRoot.addEventListener('keydown', (e) => {
                        if (!(e.target && e.target.classList && e.target.classList.contains('entry-tag-input'))) return;
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            const entry = e.target.closest('.entry');
                            if (!entry) return;
                            setEntryTagEditMode(entry, false, { clearDraft: true });
                            return;
                        }
                        if (e.key !== 'Enter' && e.key !== ',') return;
                        const entry = e.target.closest('.entry');
                        if (!entry) return;
                        if (e.key === ',') {
                            e.preventDefault();
                            if (commitTagInput(entry)) {
                                triggerStructureUpdate();
                            }
                            return;
                        }
                        window.requestAnimationFrame(() => {
                            if (!isEntryTagEditMode(entry)) return;
                            if (commitTagInput(entry)) {
                                triggerStructureUpdate();
                            }
                        });
                    });
                    appRoot.addEventListener('focusout', (e) => {
                        if (!(e.target && e.target.classList && e.target.classList.contains('entry-tag-input'))) return;
                        const entry = e.target.closest('.entry');
                        if (!entry || !isEntryTagEditMode(entry)) return;
                        const nextTarget = e.relatedTarget;
                        if (nextTarget && entry.contains(nextTarget)) return;
                        if ((e.target.value || '').trim() !== '') return;
                        setEntryTagEditMode(entry, false, { clearDraft: true });
                    });
		            document.getElementById('app-root').addEventListener('keyup', (e) => {
		                if (isSubsectionOrSectionTarget(e.target)) {
		                    triggerContentUpdate(e);
		                }
		            });
		            document.getElementById('main-title').addEventListener('input', (e) => {
		                document.title = (e.target.textContent || '') || 'Untitled Document';
		                triggerContentUpdate(e);
		            });
	            document.getElementById('help-btn').addEventListener('click', openHelp);
	            if (els.tocFab) els.tocFab.addEventListener('click', () => setTocDrawerOpen(true));
	            if (els.tocDrawerClose) els.tocDrawerClose.addEventListener('click', closeTocDrawer);
	            if (els.tocDrawerBackdrop) els.tocDrawerBackdrop.addEventListener('click', closeTocDrawer);
	            if (els.tocDrawerList) {
	                els.tocDrawerList.addEventListener('click', (e) => {
	                    if (e.target.closest('a')) closeTocDrawer();

                });
	            }
		            if (els.highlightToggleBtn) {
		                els.highlightToggleBtn.addEventListener('click', () => {
		                    setHighlightPanelOpen(els.highlightPanel.hidden);
		                });
		            }
		            document.getElementById('close-help-btn').addEventListener('click', closeHelp);
		            els.helpModal.addEventListener('click', (e) => {
		                if (e.target === els.helpModal) closeHelp();
		            });
	            document.getElementById('reset-btn').addEventListener('click', openResetModal);
	            document.getElementById('cancel-reset-btn').addEventListener('click', closeResetModal);
	            document.getElementById('confirm-reset-btn').addEventListener('click', resetDocumentNow);
	            document.getElementById('reset-confirm-input').addEventListener('input', updateResetConfirmState);
	            document.getElementById('reset-confirm-input').addEventListener('keydown', (e) => {
	                if (e.key !== 'Enter') return;
	                e.preventDefault();
	                if (!document.getElementById('confirm-reset-btn').disabled) {
	                    resetDocumentNow();
	                }
	            });
	            els.resetModal.addEventListener('click', (e) => {
	                if (e.target === els.resetModal) closeResetModal();
	            });
            const cancelMoveBtn = document.getElementById('cancel-move-entry-btn');
            if (cancelMoveBtn) {
                cancelMoveBtn.addEventListener('click', closeMoveEntryModal);
            }
            if (els.moveEntryModal) {
                els.moveEntryModal.addEventListener('click', (e) => {
                    if (e.target === els.moveEntryModal) closeMoveEntryModal();
                });
            }
            if (els.confirmMoveEntryBtn) {
                els.confirmMoveEntryBtn.addEventListener('click', () => {
                    moveEntryToSelectedTarget();
                });
            }
            if (els.moveEntryTargetList) {
                els.moveEntryTargetList.addEventListener('click', (e) => {
                    const option = e.target.closest('.move-entry-target-option');
                    if (!option || !state.moveEntryContext) return;
                    state.moveEntryContext.targetId = option.dataset.targetId || '';
                    renderMoveEntryTargetList();
                });
            }
	            document.getElementById('toc-level-btn').addEventListener('click', () => {
		                state.tocIncludeEntries = !state.tocIncludeEntries;
		                localStorage.setItem('toc-include-entries', state.tocIncludeEntries ? '1' : '0');
		                updateTocToggleLabel();
		                generateTOC();
		            });
		            if (els.entrySearch) {
		                els.entrySearch.addEventListener('input', applyEntrySearch);
		                els.entrySearch.addEventListener('keydown', (e) => {
		                    if (e.key !== 'Escape') return;
		                    e.preventDefault();
		                    clearEntrySearch();
		                });
		            }
                    if (els.searchTagFilters) {
                        els.searchTagFilters.addEventListener('mousedown', (e) => {
                            const searchTagFilter = e.target.closest('.search-tag-filter');
                            if (!searchTagFilter) return;
                            e.preventDefault();
                        });
                        els.searchTagFilters.addEventListener('click', (e) => {
                            const searchTagFilter = e.target.closest('.search-tag-filter');
                            if (!searchTagFilter) return;
                            const tagKey = searchTagFilter.dataset.tagKey || '';
                            updateSelectedSearchTags({
                                tagKey,
                                useAll: !!e.shiftKey,
                                toggle: !!(e.metaKey || e.ctrlKey || e.shiftKey),
                            });
                            applyEntrySearchPreservingScroll();
                        });
                    }
		            document.getElementById('add-highlight-color-btn').addEventListener('click', () => {
		                state.highlightPalette.push(defaultHighlightPalette[state.highlightPalette.length % defaultHighlightPalette.length]);
		                persistHighlightPalette();
		                renderHighlightPaletteEditor();
		                renderHighlightPopup();
		            });
		            document.addEventListener('keydown', onGlobalKeydown);

		            if (els.updateNowBtn) {
		                els.updateNowBtn.addEventListener('click', () => {
		                    runSelfUpdate();
		                });
		            }
		            if (els.updateNotNowBtn) {
		                els.updateNotNowBtn.addEventListener('click', () => {
		                    ignoreUpdateSha(state.updateCandidateIgnoreToken || state.updateCandidateSha);
		                    closeUpdateModal();
		                });
		            }
		            if (els.updateModal) {
		                els.updateModal.addEventListener('click', (e) => {
		                    if (e.target !== els.updateModal) return;
		                    ignoreUpdateSha(state.updateCandidateIgnoreToken || state.updateCandidateSha);
		                    closeUpdateModal();
		                });
		            }
		        }

	        function onGlobalKeydown(e) {
	            if (els.tocDrawer && !els.tocDrawer.hidden && e.key === 'Escape') {
	                e.preventDefault();
	                closeTocDrawer();
	                return;
	            }
	            if (els.updateModal && !els.updateModal.hidden && e.key === 'Escape') {
		                e.preventDefault();
		                ignoreUpdateSha(state.updateCandidateIgnoreToken || state.updateCandidateSha);
		                closeUpdateModal();
		                return;
		            }
                    if (els.moveEntryModal && !els.moveEntryModal.hidden && e.key === 'Escape') {
                        e.preventDefault();
                        closeMoveEntryModal();
                        return;
                    }
		            if (!els.helpModal.hidden && e.key === 'Escape') {
		                e.preventDefault();
		                closeHelp();
		                return;
		            }
		            if (!els.resetModal.hidden && e.key === 'Escape') {
		                e.preventDefault();
		                closeResetModal();
		            }
		        }

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

        function buildSavableHtml() {
            const snapshot = document.documentElement.cloneNode(true);
            const snapshotBody = snapshot.querySelector('body');

            if (snapshotBody) {
                snapshotBody.classList.remove('is-editing');
                snapshotBody.querySelectorAll('[contenteditable]').forEach((el) => {
                    el.setAttribute('contenteditable', 'false');
                });
                clearSearchDecorations(snapshotBody);
                const snapshotSearch = snapshotBody.querySelector('#entry-search');
                if (snapshotSearch) snapshotSearch.value = '';
                snapshotBody.querySelectorAll('.entry-tag-row').forEach((row) => {
                    row.dataset.editingTags = 'false';
                });
                snapshotBody.querySelectorAll('.entry-tag-input').forEach((input) => {
                    input.value = '';
                });
                snapshotBody.querySelectorAll('.entry, .section, .subsection-group').forEach((el) => {
                    el.hidden = false;
                });
                sanitizeTextFormattingInRoot(snapshotBody);
                snapshotBody.querySelectorAll('.dragging, .drag-over-top, .drag-over-bottom').forEach((el) => {
                    el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
                });
            }

            const snapshotBtn = snapshot.querySelector('#enable-edit-btn');
            if (snapshotBtn) snapshotBtn.removeAttribute('style');

	            const snapshotStatus = snapshot.querySelector('#save-status');
	            if (snapshotStatus) snapshotStatus.textContent = 'Read-Only Mode';

            const snapshotToast = snapshot.querySelector('#toast');
            if (snapshotToast) snapshotToast.classList.remove('show');
            const snapshotHelpModal = snapshot.querySelector('#help-modal');
            if (snapshotHelpModal) snapshotHelpModal.setAttribute('hidden', '');
            const snapshotResetModal = snapshot.querySelector('#reset-modal');
            if (snapshotResetModal) snapshotResetModal.setAttribute('hidden', '');
            const snapshotMoveEntryModal = snapshot.querySelector('#move-entry-modal');
            if (snapshotMoveEntryModal) snapshotMoveEntryModal.setAttribute('hidden', '');
            const snapshotResetInput = snapshot.querySelector('#reset-confirm-input');
            if (snapshotResetInput) snapshotResetInput.value = '';
            const snapshotResetBtn = snapshot.querySelector('#confirm-reset-btn');
            if (snapshotResetBtn) snapshotResetBtn.setAttribute('disabled', '');
            const snapshotMoveEntryTargetName = snapshot.querySelector('#move-entry-target-name');
            if (snapshotMoveEntryTargetName) snapshotMoveEntryTargetName.textContent = 'No destination selected';
            const snapshotMoveEntryTargetList = snapshot.querySelector('#move-entry-target-list');
            if (snapshotMoveEntryTargetList) snapshotMoveEntryTargetList.replaceChildren();
            const snapshotConfirmMoveBtn = snapshot.querySelector('#confirm-move-entry-btn');
            if (snapshotConfirmMoveBtn) snapshotConfirmMoveBtn.setAttribute('disabled', '');

            return "<!DOCTYPE html>\n" + snapshot.outerHTML;
        }

        // Preserve the legacy browser-global hook used by the E2E tests and
        // lightweight integrations, even though the bundled app is scoped.
        window.buildSavableHtml = buildSavableHtml;

	        // SELF-HEALING: Force reset to read-only mode on every page load
	        window.addEventListener('DOMContentLoaded', async () => {
	            state.tocIncludeEntries = localStorage.getItem('toc-include-entries') === '1';
	            updateTocToggleLabel();
	            initializeHighlightPalette();
	            setHighlightPanelOpen(false);
	            setEditingMode(false);
	            const supportsFileSystemAccess = typeof window.showOpenFilePicker === 'function';
	            if (!supportsFileSystemAccess) {
	                state.isUnsupportedBrowser = true;
	                els.status.textContent = 'Use a Chromium-based browser for editing/saving';
	                const editBtn = document.getElementById('enable-edit-btn');
	                if (editBtn) {
	                    editBtn.hidden = true;
	                }
                const resetBtn = document.getElementById('reset-btn');
                if (resetBtn) {
                    resetBtn.hidden = true;
                }
                const helpBtn = document.getElementById('help-btn');
	                if (helpBtn) {
	                    helpBtn.hidden = true;
	                }
	                if (els.highlightToggleBtn) {
	                    els.highlightToggleBtn.hidden = true;
	                }
	                if (els.highlightPanel) {
	                    els.highlightPanel.hidden = true;
	                }
	            }
            
	            // Clean up any lingering inline styles that might have gotten saved previously
	            const btn = document.getElementById('enable-edit-btn');
	            if (btn && !state.isUnsupportedBrowser) btn.removeAttribute('style');

                normalizeDocument();
            
	            bindBaseListeners();
	            observeInlineToc();
	            generateTOC();
	            applyEntrySearch();

	        });

	        window.addEventListener('storage', (e) => {
	            if (!state.editLockKey) return;
	            if (!e || e.key !== fileSession.storageKey(state.editLockKey)) return;
	            const next = fileSession.readLock(state.editLockKey);
	            if (!next || !next.owner) return;
	            if (next.owner !== fileSession.sessionId && !fileSession.isStale(next) && document.body.classList.contains('is-editing')) {
	                fileSession.handleLostLock(next);
	            }
	        });

        window.addEventListener('beforeunload', () => {
            try { fileSession.release(); } catch {}
        });

	        document.getElementById('enable-edit-btn').addEventListener('click', async () => {
            if (document.body.classList.contains('is-editing')) {
                fileSession.release();
                setEditingMode(false);
                return;
            }

	            try {
	                if (!state.fileHandle) {
	                    const pickerOptions = {
	                        id: 'clippings-open-file',
	                        types: [{ description: 'HTML File', accept: {'text/html': ['.html']} }],
	                        multiple: false
	                    };
                    [state.fileHandle] = await window.showOpenFilePicker(pickerOptions);
                }

                if (!await fileSession.ensureWritePermission(state.fileHandle)) {
                    els.status.textContent = 'Write permission is required to edit this file';
                    return;
                }

	                const lockOk = await fileSession.acquire(state.fileHandle);
	                if (!lockOk) return;

	                setEditingMode(true);
	                maybePromptForUpdateOnce();

	                scheduleGenerateTOC();
	            } catch (err) {
	                console.error("Editing aborted or failed:", err);
	            }
	        });

	        function scheduleAutosave() {
	            clearTimeout(state.saveTimeout);
	            els.status.textContent = 'Saving...';
	            state.saveTimeout = setTimeout(saveToDisk, 500);
	        }

	        function isTocTitleTarget(node) {
	            return !!(node && node.classList && (
	                node.classList.contains('section-title') ||
	                node.classList.contains('subsection-title') ||
	                node.classList.contains('entry-title')
	            ));
	        }

	        function triggerContentUpdate(e) {
	            if (e && e.target && e.target.classList && e.target.classList.contains('entry-title')) {
	                e.target.dataset.auto = 'false';
	            }

	            const target = e && e.target ? e.target : null;
	            const isBodyOrSourceEdit = !!(target && target.closest && target.closest('.text, .source'));
	            const entry = isBodyOrSourceEdit && target.closest ? target.closest('.entry') : null;
	            const autoChanged = isBodyOrSourceEdit ? autoTitle(entry) : autoTitle();

	            if (isTocTitleTarget(target) || (state.tocIncludeEntries && autoChanged)) {
	                scheduleGenerateTOC();
	            }
	            if (els.entrySearch && els.entrySearch.value.trim()) {
	                applyEntrySearch();
	            }
	            scheduleAutosave();
	        }

        function triggerStructureUpdate() {
            normalizeDocument();
	            autoTitle();
	            scheduleGenerateTOC();
	            applyEntrySearch();
	            scheduleAutosave();
	        }

	        function showToast() {
            const toast = document.getElementById('toast');
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
	            els.status.textContent = 'Editing Enabled - Auto-saving...';
	        }

        async function saveToDisk() {
            if (!state.fileHandle) return;
            if (!document.body.classList.contains('is-editing')) return;
            if (!fileSession.hasEditLock()) {
	                els.status.textContent = 'Save blocked: another tab is editing this file';
	                return;
	            }
	            if (state.saveInProgress) {
	                state.pendingSave = true;
	                return;
	            }

            state.saveInProgress = true;
            const saveHandle = state.fileHandle;
            const saveLockKey = state.editLockKey;
            const stillOwnsSaveLock = () => (
                state.fileHandle === saveHandle &&
                state.editLockKey === saveLockKey &&
                document.body.classList.contains('is-editing') &&
                fileSession.hasEditLock()
            );
            let writable = null;
            try {
                const htmlContent = buildSavableHtml();

                if (!stillOwnsSaveLock()) return;
                writable = await saveHandle.createWritable();
                if (!stillOwnsSaveLock()) {
                    if (typeof writable.abort === 'function') await writable.abort();
                    return;
                }
                await writable.write(htmlContent);
                if (!stillOwnsSaveLock()) {
                    if (typeof writable.abort === 'function') await writable.abort();
                    return;
                }
                await writable.close();
                writable = null;
                
                showToast();
            } catch (err) {
                if (writable && typeof writable.abort === 'function') {
                    try { await writable.abort(); } catch {}
                }
                els.status.textContent = 'Error saving!';
                console.error("Save failed:", err);
	            } finally {
	                state.saveInProgress = false;
	                if (state.pendingSave) {
	                    state.pendingSave = false;
	                    saveToDisk();
	                }
	            }
	        }

	        function autoTitleForEntry(entry) {
	            if (!entry) return false;
	            const titleEl = entry.querySelector('.entry-title');
	            if (!titleEl) return false;

	            const sourceEl = entry.querySelector('.source');
	            const textEl = entry.querySelector('.text');
	            const sourceText = (sourceEl ? sourceEl.innerText : '').trim();
	            const bodyText = (textEl ? textEl.innerText : '').trim();

	            const words = bodyText.split(/\s+/).slice(0, 4).join(' ');
	            const generatedTitle = `${sourceText ? sourceText + ' - ' : ''}${words}${words.length > 0 ? '...' : ''}`;

	            if ((titleEl.textContent || '').trim() === '') {
	                titleEl.dataset.auto = 'true';
	            }

	            if (titleEl.dataset.auto === 'true' || !titleEl.hasAttribute('data-auto')) {
	                if (generatedTitle.length > 3 && document.activeElement !== titleEl) {
	                    if (titleEl.textContent !== generatedTitle) {
	                        titleEl.textContent = generatedTitle;
	                    }
	                    titleEl.dataset.auto = 'true';
	                    return true;
	                }
	            }
	            return false;
	        }

	        function autoTitle(entry = null) {
	            if (entry) return autoTitleForEntry(entry);

	            let changed = false;
	            document.querySelectorAll('.entry').forEach((el) => {
	                changed = autoTitleForEntry(el) || changed;
	            });
	            return changed;
	        }


        function closeSectionMenus() {
            document.querySelectorAll('.section-menu:not([hidden])').forEach((menu) => {
                menu.hidden = true;
                const section = menu.closest('.section');
                if (section) section.classList.remove('has-open-section-menu');
                const toggle = menu.parentElement && menu.parentElement.querySelector(':scope > .item-toolbar > .section-menu-toggle');
                if (toggle) toggle.setAttribute('aria-expanded', 'false');
            });
        }

        function toggleSectionMenu(toggle) {
            const menu = toggle.closest('h2')?.querySelector(':scope > .section-menu');
            if (!menu) return;
            const willOpen = menu.hidden;
            closeSectionMenus();
            menu.hidden = !willOpen;
            toggle.setAttribute('aria-expanded', String(willOpen));
            if (willOpen) {
                const section = toggle.closest('.section');
                if (section) section.classList.add('has-open-section-menu');
            }
        }

        function addSectionRelativeTo(section, position) {
            if (!section || !section.parentNode) return;
            const newSection = createSectionElement();
            if (position === 'above') {
                section.parentNode.insertBefore(newSection, section);
            } else {
                section.parentNode.insertBefore(newSection, section.nextSibling);
            }
            closeSectionMenus();
            focusEditableAtEnd(newSection.querySelector('.section-title'));
            triggerStructureUpdate();
        }


	        function createDeleteButton(deleteType, text, testId) {
	            const button = document.createElement('button');
	            button.type = 'button';
	            button.className = 'delete-btn';
	            button.dataset.deleteType = deleteType;
	            if (testId) button.setAttribute('data-testid', testId);
	            button.textContent = text;
	            return button;
	        }

        function createEntryMoveButton(direction, testId) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `entry-move-btn entry-move-${direction}`;
	            button.dataset.moveDirection = direction;
	            if (testId) button.setAttribute('data-testid', testId);
	            button.setAttribute('aria-label', direction === 'up' ? 'Move Entry Up' : 'Move Entry Down');
	            button.title = direction === 'up' ? 'Move entry up' : 'Move entry down';
            button.textContent = direction === 'up' ? '↑' : '↓';
            return button;
        }

        function createEntryRelocateButton() {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'entry-relocate-btn';
            button.setAttribute('data-testid', 'move-entry');
            button.setAttribute('aria-label', 'Move Entry To Another Group');
            button.title = 'Move entry to another section or subsection';
            button.textContent = 'Move...';
            return button;
        }

	        function createEditableSpan(className, testId, placeholder) {
	            const span = document.createElement('span');
	            span.className = className;
	            span.setAttribute('contenteditable', 'true');
	            if (testId) span.setAttribute('data-testid', testId);
	            if (placeholder) span.dataset.placeholder = placeholder;
	            return span;
	        }

	        function createAddButton(classNames, testId, text) {
	            const button = document.createElement('button');
	            button.type = 'button';
	            button.className = classNames;
	            if (testId) button.setAttribute('data-testid', testId);
	            button.textContent = text;
	            return button;
	        }

	        function createEntryElement() {
	            const entry = document.createElement('div');
	            entry.className = 'entry draggable';
	            entry.dataset.type = 'entry';

	            const heading = document.createElement('h4');
	            const toolbar = document.createElement('span');
	            toolbar.className = 'item-toolbar';

            const title = createEditableSpan('entry-title', 'entry-title', 'Title (Auto-generates if empty)');
            const moveUp = createEntryMoveButton('up', 'move-entry-up');
            const moveDown = createEntryMoveButton('down', 'move-entry-down');
            const relocate = createEntryRelocateButton();
            const del = createDeleteButton('entry', 'Delete Entry', 'delete-entry');
            toolbar.append(title, moveUp, moveDown, relocate, del);
	            heading.appendChild(toolbar);

	            const source = document.createElement('div');
	            source.className = 'source';
	            source.setAttribute('data-testid', 'entry-source');
	            source.setAttribute('contenteditable', 'true');
	            source.dataset.placeholder = 'Source...';

	            const text = document.createElement('div');
	            text.className = 'text';
	            text.setAttribute('data-testid', 'entry-text');
	            text.setAttribute('contenteditable', 'true');
	            text.dataset.placeholder = 'Paste notes here...';

	            entry.append(heading, source, text);
                ensureEntryTagUi(entry);
	            return entry;
	        }

        function createSubsectionElement() {
	            const group = document.createElement('div');
	            group.className = 'subsection-group draggable';
	            group.dataset.type = 'subsection';

	            const heading = document.createElement('h3');
	            const toolbar = document.createElement('span');
	            toolbar.className = 'item-toolbar';
            const title = createEditableSpan('subsection-title', 'subsection-title', 'Subsection Title...');
            const collapse = document.createElement('button');
            collapse.type = 'button';
            collapse.className = 'collapse-toggle';
            collapse.setAttribute('data-testid', 'collapse-subsection');
            const del = createDeleteButton('subsection', 'Delete Subsection', 'delete-subsection');
            toolbar.append(collapse, title, del);
            heading.appendChild(toolbar);

            const addSub = createAddButton('add-btn add-subsection', 'add-subsection', '+ Add Subsection');
	            const addEntry = createAddButton('add-btn add-entry', 'add-entry', '+ Add Entry');
	            group.append(heading, addSub, addEntry);
	            return group;
	        }

	        function createSectionElement() {
	            const section = document.createElement('div');
	            section.className = 'section draggable';
	            section.dataset.type = 'section';

	            const heading = document.createElement('h2');
	            const toolbar = document.createElement('span');
	            toolbar.className = 'item-toolbar';
            const title = createEditableSpan('section-title', 'section-title', 'Section Title...');
            const collapse = document.createElement('button');
            collapse.type = 'button';
            collapse.className = 'collapse-toggle';
            collapse.setAttribute('data-testid', 'collapse-section');
            toolbar.append(collapse, title);
            heading.appendChild(toolbar);

            const addEntryTop = createAddButton('add-btn add-entry-top', 'add-entry-top', '+ Add Entry');
            const addSub = createAddButton('add-btn add-subsection', 'add-subsection', '+ Add Subsection');
            const addEntry = createAddButton('add-btn add-entry', 'add-entry', '+ Add Entry');
            section.append(heading, addSub, addEntryTop, addEntry);
            return section;
        }

        function getSiblingEntry(entry, direction) {
            if (!entry) return null;
            let sibling = direction === 'up' ? entry.previousElementSibling : entry.nextElementSibling;
            while (sibling) {
                if (sibling.classList && sibling.classList.contains('entry')) {
                    return sibling;
                }
                sibling = direction === 'up' ? sibling.previousElementSibling : sibling.nextElementSibling;
            }
            return null;
        }

        function syncEntryMoveButtons(root = document) {
            root.querySelectorAll('.entry').forEach((entry) => {
                const upButton = entry.querySelector('.entry-move-up');
                const downButton = entry.querySelector('.entry-move-down');
                if (upButton) upButton.disabled = !getSiblingEntry(entry, 'up');
                if (downButton) downButton.disabled = !getSiblingEntry(entry, 'down');
            });
        }

        function animateEntrySwap(entry, sibling, beforeRects) {
            if (!entry || !sibling || !beforeRects) return;

            const entryAfter = entry.getBoundingClientRect();
            const siblingAfter = sibling.getBoundingClientRect();
            const entryDeltaY = beforeRects.entry.top - entryAfter.top;
            const siblingDeltaY = beforeRects.sibling.top - siblingAfter.top;
            const animationTargets = [
                { element: entry, deltaY: entryDeltaY },
                { element: sibling, deltaY: siblingDeltaY }
            ].filter(({ deltaY }) => Math.abs(deltaY) > 0.5);

            if (animationTargets.length === 0) return;

            animationTargets.forEach(({ element, deltaY }) => {
                element.classList.remove('entry-swap-animating');
                element.style.transition = 'none';
                element.style.transform = `translateY(${deltaY}px)`;
            });

            // Force the browser to acknowledge the inverted starting position before we transition back.
            animationTargets.forEach(({ element }) => void element.offsetHeight);

            requestAnimationFrame(() => {
                animationTargets.forEach(({ element }) => {
                    element.classList.add('entry-swap-animating');
                    element.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 260ms ease';
                    element.style.transform = 'translateY(0)';
                });
            });

            window.setTimeout(() => {
                animationTargets.forEach(({ element }) => {
                    element.classList.remove('entry-swap-animating');
                    element.style.removeProperty('transition');
                    element.style.removeProperty('transform');
                });
            }, 320);
        }

        function moveEntry(button, direction) {
            const entry = button.closest('.entry');
            if (!entry || !entry.parentNode) return false;

            const sibling = getSiblingEntry(entry, direction);
            if (!sibling) return false;
            const beforeRects = {
                entry: entry.getBoundingClientRect(),
                sibling: sibling.getBoundingClientRect()
            };

            if (direction === 'up') {
                entry.parentNode.insertBefore(entry, sibling);
            } else {
                entry.parentNode.insertBefore(sibling, entry);
            }
            animateEntrySwap(entry, sibling, beforeRects);
            return true;
        }

	        function deleteItem(button) {
            const deleteType = button.dataset.deleteType;
            const target = button.closest(deleteType === 'entry' ? '.entry' : deleteType === 'subsection' ? '.subsection-group' : '.section');
            if (!target) return;

            const labelTarget = target.querySelector(
                deleteType === 'entry' ? '.entry-title' : deleteType === 'subsection' ? '.subsection-title' : '.section-title'
            );
	            const label = (labelTarget && (labelTarget.textContent || '').trim()) || `this ${deleteType}`;
	            const scopeNote = deleteType === 'entry' ? '' : ' This also removes everything inside it.';
	            if (!window.confirm(`Delete "${label}"?${scopeNote}`)) return;

	            target.remove();
	            triggerStructureUpdate();
	        }

	        document.body.addEventListener('click', (e) => {
	            const collapseTitle = e.target.closest('.section-title, .subsection-title');
	            if (collapseTitle && !document.body.classList.contains('is-editing')) {
	                const container = collapseTitle.closest(containerSelector);
                if (container) {
                    container.dataset.collapsed = container.dataset.collapsed === 'true' ? 'false' : 'true';
                    syncContainerCollapseState(container);
                }
                return;
            }

	            const tocLink = e.target.closest('#toc a, #toc-drawer-list a');
	            if (tocLink) {
	                const targetId = tocLink.getAttribute('href')?.slice(1);
                if (targetId) expandTocTarget(document.getElementById(targetId));
                if (tocLink.closest('#toc-drawer-list')) closeTocDrawer();
                return;
	            }

	            const sectionMenuAction = e.target.closest('.section-menu-item[data-section-action]');
	            if (sectionMenuAction) {
	                const section = sectionMenuAction.closest('.section');
	                if (document.body.classList.contains('is-editing') && section) {
	                    addSectionRelativeTo(section, sectionMenuAction.dataset.sectionAction === 'add-above' ? 'above' : 'below');
	                }
	                return;
	            }

	            const sectionMenuToggle = e.target.closest('.section-menu-toggle');
	            if (sectionMenuToggle) {
	                toggleSectionMenu(sectionMenuToggle);
	                return;
	            }

	            if (!e.target.closest('.section-menu')) closeSectionMenus();

	            const collapseButton = e.target.closest('.collapse-toggle');
	            if (collapseButton) {
	                const container = collapseButton.closest(containerSelector);
	                if (!container) return;
	                container.dataset.collapsed = container.dataset.collapsed === 'true' ? 'false' : 'true';
	                syncContainerCollapseState(container);
	                if (document.body.classList.contains('is-editing')) {
	                    triggerStructureUpdate();
	                }
	                return;
	            }

	            if (!document.body.classList.contains('is-editing')) return;

            const relocateButton = e.target.closest('.entry-relocate-btn');
            if (relocateButton) {
                const entry = relocateButton.closest('.entry');
                if (!entry) return;
                openMoveEntryModal(entry);
                return;
            }

            const moveButton = e.target.closest('.entry-move-btn');
            if (moveButton) {
                const movedEntry = moveButton.closest('.entry');
                if (moveEntry(moveButton, moveButton.dataset.moveDirection)) {
                    triggerStructureUpdate();
                    window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => {
                            if (movedEntry && movedEntry.isConnected && !movedEntry.hidden) {
                                movedEntry.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
                            }
                        });
                    });
                }
                return;
            }

            const deleteButton = e.target.closest('.delete-btn');
            if (deleteButton) {
                deleteItem(deleteButton);
                return;
            }

            const tagRemoveButton = e.target.closest('.entry-tag-remove');
            if (tagRemoveButton) {
                const entry = tagRemoveButton.closest('.entry');
                const tagChip = tagRemoveButton.closest('.entry-tag');
                if (!entry || !tagChip) return;
                removeTagFromEntry(entry, tagChip.dataset.tagKey || '');
                triggerStructureUpdate();
                return;
            }

            const tagAddButton = e.target.closest('.entry-tag-add');
            if (tagAddButton) {
                const entry = tagAddButton.closest('.entry');
                if (!entry) return;
                if (commitTagInput(entry)) {
                    triggerStructureUpdate();
                }
                return;
            }

            const tagEditToggle = e.target.closest('.entry-tag-edit-toggle');
            if (tagEditToggle) {
                const entry = tagEditToggle.closest('.entry');
                if (!entry) return;
                setEntryTagEditMode(entry, true, { focusInput: true });
                return;
            }

            const tagDoneButton = e.target.closest('.entry-tag-done');
            if (tagDoneButton) {
                const entry = tagDoneButton.closest('.entry');
                if (!entry) return;
                finishTagEditing(entry);
                return;
            }

	            if (e.target.classList.contains('add-entry') || e.target.classList.contains('add-entry-top')) {
                    if (hasActiveEntrySearch()) {
                        clearEntrySearch();
                    }
	                const newEntry = createEntryElement();
                    const position = e.target.classList.contains('add-entry-top') ? 'start' : 'end';
                    const container = e.target.parentNode;
                    const insertAnchor = getContainerInsertAnchor(container, '.add-entry', position);
                    if (insertAnchor) {
                        container.insertBefore(newEntry, insertAnchor);
                    } else {
                        container.appendChild(newEntry);
                    }
                    focusEditableAtEnd(newEntry.querySelector('.entry-title'));
	                triggerStructureUpdate();
	            }
            
	            if (e.target.classList.contains('add-subsection')) {
                    if (hasActiveEntrySearch()) {
                        clearEntrySearch();
                    }
	                const newSubsection = createSubsectionElement();
	                e.target.parentNode.insertBefore(newSubsection, e.target);
	                focusEditableAtEnd(newSubsection.querySelector('.subsection-title'));
	                triggerStructureUpdate();
	            }

		            if (e.target.classList.contains('add-section')) {
                        if (hasActiveEntrySearch()) {
                            clearEntrySearch();
                        }
		                const newSection = createSectionElement();
		                document.getElementById('app-root').appendChild(newSection);
		                focusEditableAtEnd(newSection.querySelector('.section-title'));
		                triggerStructureUpdate();
		            }
	        });

	        function clearTocDragIndicators() {
	            document.querySelectorAll('#toc .drag-over-top, #toc .drag-over-bottom').forEach((el) => {
	                el.classList.remove('drag-over-top', 'drag-over-bottom');
	            });
	        }

		        function cleanupTocDrag() {
		            if (state.tocDragState && state.tocDragState.sourceItem) {
		                state.tocDragState.sourceItem.classList.remove('dragging');
		            }
		            clearTocDragIndicators();
		            state.tocDragState = null;
		        }

		        function getTocDropTarget(target) {
		            const li = target && target.closest ? target.closest('#toc li.draggable[data-toc-type][data-target-id]') : null;
		            if (!li) return null;
		            if (!state.tocDragState) return null;
		            if (li === state.tocDragState.sourceItem) return null;
		            if (li.dataset.tocType !== state.tocDragState.tocType) return null;
		            if ((li.dataset.parentId || '') !== (state.tocDragState.parentId || '')) return null;
		            if (li.parentElement !== state.tocDragState.sourceList) return null;
		            return li;
		        }

	        document.addEventListener('dragstart', (e) => {
	            const handle = e.target.closest ? e.target.closest('#toc .toc-drag-handle') : null;
	            if (!handle) return;
	            if (!document.body.classList.contains('is-editing')) {
	                e.preventDefault();
	                return;
	            }

	            const sourceItem = handle.closest('li.draggable[data-toc-type][data-target-id]');
	            if (!sourceItem) return;
	            const targetId = sourceItem.dataset.targetId;
	            const targetNode = targetId ? document.getElementById(targetId) : null;
	            if (!targetNode) {
	                e.preventDefault();
	                return;
	            }

		            state.tocDragState = {
		                sourceItem,
		                sourceList: sourceItem.parentElement,
		                tocType: sourceItem.dataset.tocType,
		                parentId: sourceItem.dataset.parentId || '',
		                targetNode
		            };

	            sourceItem.classList.add('dragging');
	            if (e.dataTransfer) {
	                e.dataTransfer.effectAllowed = 'move';
	                e.dataTransfer.setData('text/plain', '');
	            }
	        });

		        document.addEventListener('dragover', (e) => {
		            if (!state.tocDragState) return;
		            const targetItem = getTocDropTarget(e.target);
		            if (!targetItem) return;

	            e.preventDefault();

	            const rect = targetItem.getBoundingClientRect();
	            const midpoint = rect.top + rect.height / 2;
	            clearTocDragIndicators();
	            if (e.clientY < midpoint) {
	                targetItem.classList.add('drag-over-top');
	            } else {
	                targetItem.classList.add('drag-over-bottom');
	            }
	        });

		        document.addEventListener('drop', (e) => {
		            if (!state.tocDragState) return;
		            const targetItem = getTocDropTarget(e.target);
	            if (!targetItem) {
	                cleanupTocDrag();
	                return;
	            }

	            e.preventDefault();

		            const targetId = targetItem.dataset.targetId;
		            const targetNode = targetId ? document.getElementById(targetId) : null;
		            const draggedNode = state.tocDragState.targetNode;
	            if (!targetNode || !draggedNode || targetNode.parentNode !== draggedNode.parentNode) {
	                cleanupTocDrag();
	                return;
	            }

	            const rect = targetItem.getBoundingClientRect();
	            const midpoint = rect.top + rect.height / 2;
	            if (e.clientY < midpoint) {
	                targetNode.parentNode.insertBefore(draggedNode, targetNode);
	            } else {
	                targetNode.parentNode.insertBefore(draggedNode, targetNode.nextSibling);
	            }

		            cleanupTocDrag();
		            triggerStructureUpdate();
		        });

		        document.addEventListener('dragend', () => {
		            if (!state.tocDragState) return;
		            cleanupTocDrag();
		        });
