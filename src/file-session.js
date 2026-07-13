const FILE_HANDLE_DB_NAME = 'clippings-manager';
const FILE_HANDLE_STORE_NAME = 'settings';
const FILE_HANDLE_REGISTRY_KEY = 'file-handle-registry';
const EDIT_LOCK_PREFIX = 'clippings-edit-lock:';
const EDIT_LOCK_CHANNEL = 'clippings-edit-lock';
const EDIT_LOCK_HEARTBEAT_MS = 4000;
const EDIT_LOCK_STALE_MS = 12000;

function safeParseJson(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export function createFileSession({ state, onLostLock, setStatusText, getDocumentTitle, isEditing }) {
    const editSessionId = window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    function openFileHandleDb() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB is unavailable'));
                return;
            }
            const request = window.indexedDB.open(FILE_HANDLE_DB_NAME, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(FILE_HANDLE_STORE_NAME);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Could not open file handle storage'));
        });
    }

    async function getFileHandleIdentity(handle) {
        if (handle && typeof handle.__clippings_test_file_id === 'string' && handle.__clippings_test_file_id) {
            return `test:${handle.__clippings_test_file_id}`;
        }
        if (!handle || typeof handle.isSameEntry !== 'function') return null;

        const getRegistry = async (db) => await new Promise((resolve, reject) => {
            const tx = db.transaction(FILE_HANDLE_STORE_NAME, 'readonly');
            const request = tx.objectStore(FILE_HANDLE_STORE_NAME).get(FILE_HANDLE_REGISTRY_KEY);
            request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
            request.onerror = () => reject(request.error || new Error('Could not read file identity registry'));
        });

        const register = async () => {
            const db = await openFileHandleDb();
            try {
                const entries = await getRegistry(db);
                for (const entry of entries) {
                    if (!entry || !entry.id || !entry.handle) continue;
                    try {
                        if (await entry.handle.isSameEntry(handle)) return String(entry.id);
                    } catch {
                        return null;
                    }
                }

                const id = window.crypto && typeof window.crypto.randomUUID === 'function'
                    ? window.crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                entries.push({ id, handle });
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(FILE_HANDLE_STORE_NAME, 'readwrite');
                    tx.objectStore(FILE_HANDLE_STORE_NAME).put(entries, FILE_HANDLE_REGISTRY_KEY);
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error || new Error('Could not save file identity'));
                });
                return id;
            } finally {
                db.close();
            }
        };

        if (!navigator.locks || typeof navigator.locks.request !== 'function') return null;
        try {
            return await navigator.locks.request('clippings-file-identity-registry', async () => register());
        } catch {
            return null;
        }
    }

    async function ensureWritePermission(handle) {
        if (!handle || typeof handle.queryPermission !== 'function') return false;
        let permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') return true;
        if (permission === 'prompt' && typeof handle.requestPermission === 'function') {
            permission = await handle.requestPermission({ mode: 'readwrite' });
        }
        return permission === 'granted';
    }

    function readLock(key) {
        if (!key) return null;
        try {
            return safeParseJson(localStorage.getItem(EDIT_LOCK_PREFIX + key) || '');
        } catch {
            return null;
        }
    }

    function writeLock(key, lock) {
        if (!key) return;
        try {
            localStorage.setItem(EDIT_LOCK_PREFIX + key, JSON.stringify(lock));
        } catch {
            state.editLockDisabled = true;
        }
    }

    function clearLock(key) {
        if (!key) return;
        try {
            localStorage.removeItem(EDIT_LOCK_PREFIX + key);
        } catch {
            state.editLockDisabled = true;
        }
    }

    function isStale(lock) {
        return !lock || typeof lock.ts !== 'number' || Date.now() - lock.ts > EDIT_LOCK_STALE_MS;
    }

    function hasEditLock() {
        if (state.editLockDisabled || !state.editLockWebHeld || !state.editLockKey) return false;
        const lock = readLock(state.editLockKey);
        return !!(lock && lock.owner === editSessionId && !isStale(lock));
    }

    function announce(type) {
        if (!state.editLockKey) return;
        try {
            if (!state.editLockChannel && typeof window.BroadcastChannel === 'function') {
                state.editLockChannel = new BroadcastChannel(EDIT_LOCK_CHANNEL);
                state.editLockChannel.onmessage = (event) => {
                    const message = event && event.data ? event.data : null;
                    if (!message || message.key !== state.editLockKey) return;
                    if (message.owner && message.owner !== editSessionId && isEditing()) {
                        handleLostLock(message);
                    }
                };
            }
            state.editLockChannel?.postMessage({
                type,
                key: state.editLockKey,
                owner: editSessionId,
                ts: Date.now(),
                title: String(getDocumentTitle() || '').slice(0, 120),
            });
        } catch {}
    }

    function stopHeartbeat() {
        if (state.editLockHeartbeat) {
            clearInterval(state.editLockHeartbeat);
            state.editLockHeartbeat = null;
        }
    }

    function handleLostLock(lock) {
        stopHeartbeat();
        if (isEditing()) {
            release();
            onLostLock();
        }
        const ownerTitle = lock && lock.title ? ` ("${lock.title}")` : '';
        setStatusText(`Read-Only Mode (another tab is editing this file${ownerTitle})`);
    }

    function startHeartbeat() {
        if (state.editLockDisabled) return;
        stopHeartbeat();
        state.editLockHeartbeat = setInterval(() => {
            if (!state.editLockKey) return;
            const current = readLock(state.editLockKey);
            if (current && current.owner && current.owner !== editSessionId && !isStale(current)) {
                handleLostLock(current);
                return;
            }
            writeLock(state.editLockKey, {
                owner: editSessionId,
                ts: Date.now(),
                title: String(getDocumentTitle() || '').slice(0, 120),
            });
            announce('heartbeat');
        }, EDIT_LOCK_HEARTBEAT_MS);
    }

    async function acquireWebLock(key) {
        if (!navigator.locks || typeof navigator.locks.request !== 'function') return false;
        const lockName = `clippings-edit:${key}`;
        let resolveAcquired;
        let rejectAcquired;
        const acquired = new Promise((resolve, reject) => {
            resolveAcquired = resolve;
            rejectAcquired = reject;
        });
        let releaseLock;
        const held = new Promise((resolve) => { releaseLock = resolve; });
        const lockToken = {};

        navigator.locks.request(lockName, { ifAvailable: true }, async (lock) => {
            if (!lock) {
                resolveAcquired(false);
                return false;
            }
            state.editLockWebHeld = true;
            state.editLockWebRelease = releaseLock;
            state.editLockWebToken = lockToken;
            resolveAcquired(true);
            await held;
            if (state.editLockWebToken === lockToken) {
                state.editLockWebHeld = false;
                state.editLockWebRelease = null;
                state.editLockWebToken = null;
            }
            return true;
        }).catch((error) => {
            if (state.editLockWebToken === lockToken) {
                state.editLockWebHeld = false;
                state.editLockWebRelease = null;
                state.editLockWebToken = null;
            }
            rejectAcquired(error);
        });

        try {
            return await acquired;
        } catch {
            return false;
        }
    }

    async function acquire(handle) {
        state.editLockDisabled = false;
        const identity = await getFileHandleIdentity(handle);
        state.editLockKey = identity ? `file-handle:${identity}` : null;
        if (state.editLockDisabled || !state.editLockKey || !navigator.locks || typeof navigator.locks.request !== 'function') {
            state.editLockKey = null;
            setStatusText('Editing unavailable: this browser cannot guarantee single-tab access');
            return false;
        }
        if (!await acquireWebLock(state.editLockKey)) {
            state.editLockKey = null;
            setStatusText('Read-Only Mode: another tab is editing this file');
            return false;
        }
        writeLock(state.editLockKey, {
            owner: editSessionId,
            ts: Date.now(),
            title: String(getDocumentTitle() || '').slice(0, 120),
        });
        if (state.editLockDisabled) {
            release();
            setStatusText('Editing unavailable: could not establish a persistent lock');
            return false;
        }
        startHeartbeat();
        announce('acquire');
        return true;
    }

    function release() {
        if (state.editLockKey) {
            const current = readLock(state.editLockKey);
            if (current && current.owner === editSessionId) {
                clearLock(state.editLockKey);
                announce('release');
            }
        }
        stopHeartbeat();
        state.editLockKey = null;
        state.editLockWebRelease?.();
        state.editLockWebRelease = null;
        state.editLockWebHeld = false;
        state.editLockWebToken = null;
    }

    async function write(html, handle = state.fileHandle) {
        if (!handle || !hasEditLock()) return false;
        const lockKey = state.editLockKey;
        const ownsLock = () => state.fileHandle === handle && state.editLockKey === lockKey && hasEditLock();
        let writable = null;
        try {
            if (!ownsLock()) return false;
            writable = await handle.createWritable();
            if (!ownsLock()) return false;
            await writable.write(html);
            if (!ownsLock()) return false;
            await writable.close();
            writable = null;
            return true;
        } finally {
            if (writable && typeof writable.abort === 'function') {
                try { await writable.abort(); } catch {}
            }
        }
    }

    return {
        acquire,
        ensureWritePermission,
        hasEditLock,
        release,
        handleLostLock,
        isStale,
        readLock,
        writeLock,
        editLockKey: () => state.editLockKey,
        storageKey: (key) => EDIT_LOCK_PREFIX + key,
        sessionId: editSessionId,
    };
}
