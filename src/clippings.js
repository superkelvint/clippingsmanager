
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
	            highlightPopup: document.getElementById('highlight-popup'),
	            highlightPaletteData: document.getElementById('highlight-palette-data'),
	            highlightPanel: document.getElementById('highlight-panel'),
	            highlightToggleBtn: document.getElementById('highlight-toggle-btn'),
	            entrySearch: document.getElementById('entry-search'),
                knownTagOptions: document.getElementById('known-tag-options'),
                searchTagFilters: document.getElementById('search-tag-filters'),
                searchTagFiltersHelp: document.getElementById('search-tag-filters-help'),
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

	            editLockKey: null,
	            editLockHeartbeat: null,
	            editLockChannel: null,
	            editLockDisabled: false,
	        };

        const editableSelector = '[contenteditable]';
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
        const UPDATE_IGNORE_SHA_KEY = 'clippings-update-ignore-sha';
        const LAST_UPDATED_COMMIT_KEY = 'clippings-last-updated-commit';
        const editSessionId = (window.crypto && typeof window.crypto.randomUUID === 'function')
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const EDIT_LOCK_PREFIX = 'clippings-edit-lock:';
	        const EDIT_LOCK_CHANNEL = 'clippings-edit-lock';
	        const EDIT_LOCK_HEARTBEAT_MS = 4000;
	        const EDIT_LOCK_STALE_MS = 12000;

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

            const upstreamTitle = upstreamDoc.getElementById('main-title');
            const upstreamRoot = upstreamDoc.getElementById('app-root');
            const upstreamPalette = upstreamDoc.getElementById('highlight-palette-data');

            if (!upstreamTitle || !upstreamRoot) {
                throw new Error('Upstream template is missing required elements (#main-title or #app-root).');
            }
            if (!currentTitle || !currentRoot) {
                throw new Error('Current document is missing required elements (#main-title or #app-root).');
            }

            upstreamTitle.textContent = currentTitle.textContent || '';
            upstreamRoot.innerHTML = currentRoot.innerHTML;

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
            try {
                if (!state.fileHandle) {
                    const pickerOptions = {
                        id: 'clippings-open-file-for-update',
                        types: [{ description: 'HTML File', accept: { 'text/html': ['.html'] } }],
                        multiple: false
                    };
                    [state.fileHandle] = await window.showOpenFilePicker(pickerOptions);
                }

                lockOk = await acquireEditLockForHandle(state.fileHandle);
                if (!lockOk) return;

                const currentSavableHtml = buildSavableHtml();
                const merged = mergeUserContentIntoTemplate({
                    currentHtml: currentSavableHtml,
                    upstreamHtml: state.updateCandidateHtml
                });

                const writable = await state.fileHandle.createWritable();
                await writable.write(merged);
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
                try { releaseEditLock(); } catch {}
            }
        }

	        function scheduleGenerateTOC() {
	            if (state.tocRegenRaf) return;
	            state.tocRegenRaf = window.requestAnimationFrame(() => {
	                state.tocRegenRaf = null;
	                generateTOC();
	            });
	        }

	        function safeParseJson(str) {
            try {
                return JSON.parse(str);
            } catch {
                return null;
            }
        }

        function getDocIdFromDom() {
            const meta = document.querySelector('meta[name="clippings-doc-id"]');
            return meta && meta.content ? meta.content.trim() : '';
        }

        function ensureDocIdInDom() {
            let docId = getDocIdFromDom();
            if (docId) return docId;
            docId = (window.crypto && typeof window.crypto.randomUUID === 'function')
                ? window.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'clippings-doc-id');
            meta.setAttribute('content', docId);
            (document.head || document.documentElement).appendChild(meta);
            return docId;
        }

        function computeEditLockKey(handle) {
            if (window.location && window.location.protocol === 'file:') {
                // For file://, the URL path is the most reliable identity across tabs.
                return `file:${window.location.href}`;
            }
            const docId = ensureDocIdInDom();
            const name = handle && handle.name ? handle.name : 'unknown';
            return `doc:${name}:${docId}`;
        }

        function readEditLock(key) {
            if (!key) return null;
            try {
                return safeParseJson(localStorage.getItem(EDIT_LOCK_PREFIX + key) || '');
            } catch {
                return null;
            }
        }

	        function writeEditLock(key, lock) {
            if (!key) return;
	            try {
	                localStorage.setItem(EDIT_LOCK_PREFIX + key, JSON.stringify(lock));
	            } catch {
	                state.editLockDisabled = true;
	            }
	        }

	        function clearEditLock(key) {
            if (!key) return;
	            try {
	                localStorage.removeItem(EDIT_LOCK_PREFIX + key);
	            } catch {
	                state.editLockDisabled = true;
	            }
	        }

        function isEditLockStale(lock) {
            if (!lock || typeof lock.ts !== 'number') return true;
            return (Date.now() - lock.ts) > EDIT_LOCK_STALE_MS;
        }

	        function hasEditLock() {
	            if (state.editLockDisabled) return true;
	            if (!state.editLockKey) return false;
	            const lock = readEditLock(state.editLockKey);
	            return !!(lock && lock.owner === editSessionId && !isEditLockStale(lock));
	        }

	        function announceEditLock(type) {
	            if (!state.editLockKey) return;
	            try {
	                if (!state.editLockChannel && typeof window.BroadcastChannel === 'function') {
	                    state.editLockChannel = new BroadcastChannel(EDIT_LOCK_CHANNEL);
	                    state.editLockChannel.onmessage = (ev) => {
	                        const msg = ev && ev.data ? ev.data : null;
	                        if (!msg || msg.key !== state.editLockKey) return;
	                        if (msg.owner && msg.owner !== editSessionId && document.body.classList.contains('is-editing')) {
	                            handleLostEditLock(msg);
	                        }
	                    };
	                }
	                if (state.editLockChannel) {
	                    state.editLockChannel.postMessage({
	                        type,
	                        key: state.editLockKey,
	                        owner: editSessionId,
	                        ts: Date.now(),
	                        title: (document.title || '').slice(0, 120)
	                    });
	                }
	            } catch {}
	        }

	        function stopEditLockHeartbeat() {
	            if (state.editLockHeartbeat) {
	                clearInterval(state.editLockHeartbeat);
	                state.editLockHeartbeat = null;
	            }
	        }

        function handleLostEditLock(lock) {
            stopEditLockHeartbeat();
            // Do not clear the lock; we aren't the owner anymore.
            if (document.body.classList.contains('is-editing')) {
                setEditingMode(false);
            }
            const ownerTitle = lock && lock.title ? ` ("${lock.title}")` : '';
            els.status.textContent = `Read-Only Mode (another tab is editing this file${ownerTitle})`;
        }

	        function startEditLockHeartbeat() {
	            if (state.editLockDisabled) return;
	            stopEditLockHeartbeat();
	            state.editLockHeartbeat = setInterval(() => {
	                if (!state.editLockKey) return;
	                const current = readEditLock(state.editLockKey);
	                if (current && current.owner && current.owner !== editSessionId && !isEditLockStale(current)) {
	                    handleLostEditLock(current);
	                    return;
	                }
	                writeEditLock(state.editLockKey, {
	                    owner: editSessionId,
	                    ts: Date.now(),
	                    title: (document.title || '').slice(0, 120)
	                });
	                announceEditLock('heartbeat');
	            }, EDIT_LOCK_HEARTBEAT_MS);
	        }

	        async function acquireEditLockForHandle(handle) {
	            state.editLockDisabled = false;
	            state.editLockKey = computeEditLockKey(handle);
	            if (state.editLockDisabled) {
	                state.editLockKey = null;
	                return true;
	            }
	            const existing = readEditLock(state.editLockKey);
	            if (existing && existing.owner && existing.owner !== editSessionId && !isEditLockStale(existing)) {
                const ownerTitle = existing.title ? `\n\nOther tab title: ${existing.title}` : '';
                const proceed = window.confirm(
                    'This file looks like it is already in Editing mode in another tab.' +
                    '\n\nContinuing can cause you to overwrite changes.' +
                    ownerTitle +
                    '\n\nPress Cancel to keep this tab read-only.'
	                );
	                if (!proceed) {
	                    state.editLockKey = null;
	                    return false;
	                }
	            }

	            writeEditLock(state.editLockKey, {
	                owner: editSessionId,
	                ts: Date.now(),
	                title: (document.title || '').slice(0, 120)
	            });
	            if (state.editLockDisabled) {
	                state.editLockKey = null;
	                stopEditLockHeartbeat();
	                return true;
	            }
            startEditLockHeartbeat();
            announceEditLock('acquire');
            return true;
        }

	        function releaseEditLock() {
	            if (!state.editLockKey) return;
	            const current = readEditLock(state.editLockKey);
	            if (current && current.owner === editSessionId) {
	                clearEditLock(state.editLockKey);
	                announceEditLock('release');
	            }
	            stopEditLockHeartbeat();
	            state.editLockKey = null;
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

	        function setHighlightPanelOpen(isOpen) {
	            if (!els.highlightPanel || !els.highlightToggleBtn) return;
	            els.highlightPanel.hidden = !isOpen;
	            els.highlightToggleBtn.textContent = isOpen ? 'Hide Highlights' : 'Highlight Colors';
	        }

        async function hydrateFromHandle(handle) {
            if (!handle) return false;
            try {
                const perm = await handle.queryPermission({ mode: 'read' });
                if (perm !== 'granted') return false;

                const file = await handle.getFile();
                const text = await file.text();
                if (!text) return false;

                const parser = new DOMParser();
                const parsed = parser.parseFromString(text, 'text/html');
                const parsedTitle = parsed.getElementById('main-title');
                const parsedRoot = parsed.getElementById('app-root');

                if (!parsedTitle || !parsedRoot) return false;

                document.getElementById('main-title').innerHTML = parsedTitle.innerHTML;
                document.getElementById('app-root').innerHTML = parsedRoot.innerHTML;
                removeLegacyContentDragHandles(document.getElementById('app-root'));
                enhanceEntries(document.getElementById('app-root'));
	                document.title = (parsedTitle.textContent || '').trim() || 'Untitled Document';
	                state.fileHandle = handle;
	                generateTOC();
	                return true;
            } catch (err) {
                console.error('Could not hydrate from saved file handle:', err);
                return false;
            }
        }

	        function updateTocToggleLabel() {
	            const btn = document.getElementById('toc-level-btn');
	            if (!btn) return;
	            btn.textContent = state.tocIncludeEntries ? 'Hide Entries' : 'Show Entries';
	        }

        function removeLegacyContentDragHandles(root = document) {
            if (!root) return;
            root.querySelectorAll('.drag-handle:not(.toc-drag-handle)').forEach((el) => el.remove());
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

        function buildTagSearchToken(tag) {
            const normalized = normalizeTag(tag);
            if (!normalized) return '';
            return /\s/.test(normalized) ? `tag:"${normalized}"` : `tag:${normalized}`;
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

            document.querySelectorAll('.subsection-group').forEach((group) => {
                const hasVisibleEntries = Array.from(group.querySelectorAll(':scope > .entry')).some((entry) => !entry.hidden);
                group.hidden = (hasTypedTerms || hasSelectedTagFilters) && !hasVisibleEntries;
            });

            document.querySelectorAll('.section').forEach((section) => {
                const hasVisibleDirectEntries = Array.from(section.querySelectorAll(':scope > .entry')).some((entry) => !entry.hidden);
                const hasVisibleSubsections = Array.from(section.querySelectorAll(':scope > .subsection-group')).some((group) => !group.hidden);
                section.hidden = (hasTypedTerms || hasSelectedTagFilters) && !hasVisibleDirectEntries && !hasVisibleSubsections;
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
	            document.getElementById('main-title').textContent = 'Clippings Manager';
	            document.title = 'Clippings Manager';
	            document.getElementById('app-root').replaceChildren();
                refreshKnownTags(document.getElementById('app-root'));
	            closeResetModal();
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
		            if (els.updateModal && !els.updateModal.hidden && e.key === 'Escape') {
		                e.preventDefault();
		                ignoreUpdateSha(state.updateCandidateIgnoreToken || state.updateCandidateSha);
		                closeUpdateModal();
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
            const snapshotResetInput = snapshot.querySelector('#reset-confirm-input');
            if (snapshotResetInput) snapshotResetInput.value = '';
            const snapshotResetBtn = snapshot.querySelector('#confirm-reset-btn');
            if (snapshotResetBtn) snapshotResetBtn.setAttribute('disabled', '');

            return "<!DOCTYPE html>\n" + snapshot.outerHTML;
        }

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
	            removeLegacyContentDragHandles(document.getElementById('app-root'));
                enhanceEntries(document.getElementById('app-root'));
            
	            bindBaseListeners();
	            generateTOC();
	            applyEntrySearch();

            // If this file is already being edited in another tab, surface an early warning in read-only mode.
            try {
                if (window.location && window.location.protocol === 'file:') {
                    const key = computeEditLockKey(null);
	                    const existing = readEditLock(key);
                    if (existing && existing.owner && existing.owner !== editSessionId && !isEditLockStale(existing)) {
                        const ownerTitle = existing.title ? ` ("${existing.title}")` : '';
                        els.status.textContent = `Read-Only Mode (another tab is editing this file${ownerTitle})`;
                    }
	                }
	            } catch {}
	        });

	        window.addEventListener('storage', (e) => {
	            if (!state.editLockKey) return;
	            if (!e || e.key !== (EDIT_LOCK_PREFIX + state.editLockKey)) return;
	            const next = e.newValue ? safeParseJson(e.newValue) : null;
	            if (!next || !next.owner) return;
	            if (next.owner !== editSessionId && !isEditLockStale(next) && document.body.classList.contains('is-editing')) {
	                handleLostEditLock(next);
	            }
	        });

        window.addEventListener('beforeunload', () => {
            try { releaseEditLock(); } catch {}
        });

	        document.getElementById('enable-edit-btn').addEventListener('click', async () => {
            if (document.body.classList.contains('is-editing')) {
                releaseEditLock();
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

	                const lockOk = await acquireEditLockForHandle(state.fileHandle);
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
                enhanceEntries(document.getElementById('app-root'));
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
	            if (!hasEditLock()) {
	                els.status.textContent = 'Save blocked: another tab is editing this file';
	                return;
	            }
	            if (state.saveInProgress) {
	                state.pendingSave = true;
	                return;
	            }

	            state.saveInProgress = true;
	            try {
	                const htmlContent = buildSavableHtml();

	                const writable = await state.fileHandle.createWritable();
	                await writable.write(htmlContent);
	                await writable.close();
                
	                showToast();
	            } catch (err) {
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

        function getDirectChildItems(parent, selector) {
            return Array.from(parent.children).filter((child) => child.matches(selector));
        }

	        function createTocDragHandle() {
	            const handle = document.createElement('span');
	            handle.className = 'drag-handle toc-drag-handle';
	            handle.setAttribute('data-testid', 'toc-drag-handle');
	            handle.draggable = true;
	            handle.textContent = '⋮⋮';
	            handle.title = 'Drag to reorder';
	            handle.setAttribute('aria-label', 'Drag to reorder');
	            return handle;
	        }

	        function createStableDomId(prefix) {
	            const base = (window.crypto && typeof window.crypto.randomUUID === 'function')
	                ? window.crypto.randomUUID()
	                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	            return `${prefix}-${base}`;
	        }

	        function ensureDomId(el, prefix) {
	            if (!el) return '';
	            if (el.id && el.id.trim()) return el.id;
	            el.id = createStableDomId(prefix);
	            return el.id;
	        }

	        function appendEntriesToToc(parentItem, entryNodes, parentTargetId) {
	            if (!state.tocIncludeEntries || entryNodes.length === 0) return;

	            const entryList = document.createElement('ul');
	            entryNodes.forEach((entry) => {
	                ensureDomId(entry, 'entry');
	                const rawTitle = entry.querySelector('.entry-title') ? entry.querySelector('.entry-title').textContent : '';
	                const entryTitle = rawTitle.trim() || 'Untitled Entry';

	                const entryItem = document.createElement('li');
	                entryItem.classList.add('draggable');
	                entryItem.setAttribute('data-testid', 'toc-item');
	                entryItem.dataset.tocType = 'entry';
	                entryItem.dataset.targetId = entry.id;
	                entryItem.dataset.parentId = parentTargetId || '';

                const entryRow = document.createElement('span');
                entryRow.className = 'toc-row';
                entryRow.appendChild(createTocDragHandle());
                const entryLink = document.createElement('a');
                entryLink.href = `#${entry.id}`;
                entryLink.textContent = entryTitle;
                entryRow.appendChild(entryLink);
                entryItem.appendChild(entryRow);
                entryList.appendChild(entryItem);
            });

            parentItem.appendChild(entryList);
        }

	        function generateTOC() {
	            const toc = document.getElementById('toc');
	            const topList = document.createElement('ul');

	            document.querySelectorAll('.section').forEach((sec) => {
	                const sTitle = sec.querySelector('.section-title').textContent || 'Untitled Section';
	                ensureDomId(sec, 'sec');

	                const secItem = document.createElement('li');
	                secItem.classList.add('draggable');
	                secItem.setAttribute('data-testid', 'toc-item');
	                secItem.dataset.tocType = 'section';
                secItem.dataset.targetId = sec.id;
                secItem.dataset.parentId = 'app-root';

                const secRow = document.createElement('span');
                secRow.className = 'toc-row';
                secRow.appendChild(createTocDragHandle());
                const secStrong = document.createElement('strong');
                const secLink = document.createElement('a');
                secLink.href = `#${sec.id}`;
                secLink.textContent = sTitle;
                secStrong.appendChild(secLink);
                secRow.appendChild(secStrong);
                secItem.appendChild(secRow);

	                const sectionChildren = document.createElement('ul');

	                Array.from(sec.children).forEach((child) => {
	                    if (child.matches('.subsection-group')) {
	                        const subsecTitle = child.querySelector('.subsection-title').textContent || 'Untitled Subsection';
	                        ensureDomId(child, 'subsec');

	                        const subsecItem = document.createElement('li');
	                        subsecItem.classList.add('draggable');
	                        subsecItem.setAttribute('data-testid', 'toc-item');
                        subsecItem.dataset.tocType = 'subsection';
                        subsecItem.dataset.targetId = child.id;
                        subsecItem.dataset.parentId = sec.id;

                        const subsecRow = document.createElement('span');
                        subsecRow.className = 'toc-row';
                        subsecRow.appendChild(createTocDragHandle());
                        const subsecLink = document.createElement('a');
                        subsecLink.href = `#${child.id}`;
                        subsecLink.textContent = subsecTitle;
	                        subsecRow.appendChild(subsecLink);
	                        subsecItem.appendChild(subsecRow);

	                        appendEntriesToToc(subsecItem, getDirectChildItems(child, '.entry'), child.id);
	                        sectionChildren.appendChild(subsecItem);
	                        return;
	                    }

	                    if (child.matches('.entry') && state.tocIncludeEntries) {
	                        ensureDomId(child, 'entry');
	                        const rawTitle = child.querySelector('.entry-title') ? child.querySelector('.entry-title').textContent : '';
	                        const entryTitle = rawTitle.trim() || 'Untitled Entry';

                        const entryItem = document.createElement('li');
                        entryItem.classList.add('draggable');
                        entryItem.setAttribute('data-testid', 'toc-item');
                        entryItem.dataset.tocType = 'entry';
                        entryItem.dataset.targetId = child.id;
                        entryItem.dataset.parentId = sec.id;

                        const entryRow = document.createElement('span');
                        entryRow.className = 'toc-row';
                        entryRow.appendChild(createTocDragHandle());
                        const entryLink = document.createElement('a');
                        entryLink.href = `#${child.id}`;
                        entryLink.textContent = entryTitle;
	                        entryRow.appendChild(entryLink);
	                        entryItem.appendChild(entryRow);
	                        sectionChildren.appendChild(entryItem);
	                    }
	                });

                if (sectionChildren.children.length > 0) {
                    secItem.appendChild(sectionChildren);
                }
                topList.appendChild(secItem);
            });

            toc.replaceChildren(topList);
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
	            const del = createDeleteButton('entry', 'Delete Entry', 'delete-entry');
	            toolbar.append(title, del);
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
	            const del = createDeleteButton('subsection', 'Delete Subsection', 'delete-subsection');
	            toolbar.append(title, del);
	            heading.appendChild(toolbar);

	            const addEntry = createAddButton('add-btn add-entry', 'add-entry', '+ Add Entry');
	            group.append(heading, addEntry);
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
	            const del = createDeleteButton('section', 'Delete Section', 'delete-section');
	            toolbar.append(title, del);
	            heading.appendChild(toolbar);

	            const addSub = createAddButton('add-btn add-subsection', 'add-subsection', '+ Add Subsection');
	            const addEntry = createAddButton('add-btn add-entry', 'add-entry', '+ Add Entry');
	            section.append(heading, addSub, addEntry);
	            return section;
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
	            if (!document.body.classList.contains('is-editing')) return;

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

	            if (e.target.classList.contains('add-entry')) {
                    if (hasActiveEntrySearch()) {
                        clearEntrySearch();
                    }
	                const newEntry = createEntryElement();
	                e.target.parentNode.insertBefore(newEntry, e.target);
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
