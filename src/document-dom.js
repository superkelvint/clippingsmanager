export function createDocumentDom({
    containerSelector,
    createAddButton,
    createDeleteButton,
    enhanceEntries,
}) {
    function isContainerNode(node) {
        return !!(node && node.matches && node.matches(containerSelector));
    }

    function getDirectChildItems(parent, selector) {
        return Array.from(parent.children).filter((child) => child.matches(selector));
    }

    function getDirectChildEntries(parent) {
        return getDirectChildItems(parent, '.entry');
    }

    function getDirectChildContainers(parent) {
        return getDirectChildItems(parent, containerSelector);
    }

    function getContainerTitleNode(container) {
        if (!isContainerNode(container)) return null;
        return container.classList.contains('section')
            ? container.querySelector(':scope > h2 .section-title')
            : container.querySelector(':scope > h3 .subsection-title');
    }

    function getContainerTitleText(container) {
        const titleNode = getContainerTitleNode(container);
        const title = (titleNode ? titleNode.textContent : '').trim();
        return title || (container.classList.contains('section') ? 'Untitled Section' : 'Untitled Subsection');
    }

    function createStableDomId(prefix) {
        const base = window.crypto && typeof window.crypto.randomUUID === 'function'
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return `${prefix}-${base}`;
    }

    function ensureDomId(element, prefix) {
        if (!element) return '';
        if (element.id && element.id.trim()) return element.id;
        element.id = createStableDomId(prefix);
        return element.id;
    }

    function ensureContainerDomId(container) {
        if (!isContainerNode(container)) return '';
        return ensureDomId(container, container.classList.contains('section') ? 'sec' : 'subsec');
    }

    function buildContainerDepthMap(parent, depth) {
        getDirectChildContainers(parent).forEach((container) => {
            container.dataset.depth = String(depth);
            buildContainerDepthMap(container, depth + 1);
        });
    }

    function syncContainerDepths() {
        const appRoot = document.getElementById('app-root');
        if (appRoot) buildContainerDepthMap(appRoot, 0);
    }

    function removeLegacyContentDragHandles(root = document) {
        root?.querySelectorAll('.drag-handle:not(.toc-drag-handle)').forEach((handle) => handle.remove());
    }

    function ensureSectionAddEntryTopButtons(root = document) {
        if (!root) return;
        root.querySelectorAll(containerSelector).forEach((container) => {
            const addSubsection = container.querySelector(':scope > .add-subsection');
            let addEntryTop = container.querySelector(':scope > .add-entry-top');
            if (!addEntryTop) {
                const heading = container.querySelector(container.classList.contains('section') ? ':scope > h2' : ':scope > h3');
                if (heading) {
                    addEntryTop = createAddButton('add-btn add-entry-top', 'add-entry-top', '+ Add Entry');
                    (addSubsection || heading).insertAdjacentElement('afterend', addEntryTop);
                }
            } else if (addSubsection && addEntryTop.previousElementSibling !== addSubsection) {
                addSubsection.insertAdjacentElement('afterend', addEntryTop);
            }
            if (!container.querySelector(':scope > .add-entry:not(.add-entry-top)')) {
                container.appendChild(createAddButton('add-btn add-entry', 'add-entry', '+ Add Entry'));
            }
            if (addEntryTop) {
                const entryCount = container.querySelectorAll(':scope > .entry').length;
                addEntryTop.hidden = entryCount === 1;
                const addEntryBottom = container.querySelector(':scope > .add-entry:not(.add-entry-top)');
                if (addEntryBottom) addEntryBottom.hidden = entryCount === 0;
            }
        });
    }

    function syncContainerCollapseState(container) {
        if (!isContainerNode(container)) return;
        const collapsed = container.dataset.collapsed === 'true';
        container.classList.toggle('is-collapsed', collapsed);
        const toggle = container.querySelector(':scope > h2 .collapse-toggle, :scope > h3 .collapse-toggle');
        if (!toggle) return;
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${container.classList.contains('section') ? 'section' : 'subsection'}`);
        toggle.title = collapsed ? 'Expand' : 'Collapse';
        toggle.textContent = collapsed ? '+' : '−';
    }

    function ensureContainerCollapseControls(root = document) {
        if (!root) return;
        root.querySelectorAll(containerSelector).forEach((container) => {
            const heading = container.querySelector(':scope > h2, :scope > h3');
            const toolbar = heading?.querySelector(':scope > .item-toolbar');
            if (toolbar) {
                const title = toolbar.querySelector(':scope > .section-title, :scope > .subsection-title');
                let toggle = toolbar.querySelector(':scope > .collapse-toggle');
                if (!toggle) {
                    toggle = document.createElement('button');
                    toggle.type = 'button';
                    toggle.className = 'collapse-toggle';
                    toggle.setAttribute('data-testid', container.classList.contains('section') ? 'collapse-section' : 'collapse-subsection');
                }
                if (title) toolbar.insertBefore(toggle, title);
            }
            syncContainerCollapseState(container);
        });
    }

    function createSectionMenu() {
        const menu = document.createElement('div');
        menu.className = 'section-menu';
        menu.hidden = true;
        for (const [position, label] of [['above', 'Add Section Above'], ['below', 'Add Section Below']]) {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'section-menu-item';
            item.setAttribute('data-testid', 'section-menu-item');
            item.dataset.sectionPosition = position;
            item.dataset.sectionAction = `add-${position}`;
            item.setAttribute('role', 'menuitem');
            item.textContent = label;
            menu.appendChild(item);
        }
        const deleteItem = createDeleteButton('section', 'Delete Section', 'delete-section');
        deleteItem.classList.add('section-menu-item', 'section-menu-delete');
        menu.appendChild(deleteItem);
        return menu;
    }

    function ensureSectionMenus(root = document) {
        if (!root) return;
        root.querySelectorAll(':scope .section').forEach((section) => {
            const heading = section.querySelector(':scope > h2');
            const toolbar = heading?.querySelector(':scope > .item-toolbar');
            if (!heading || !toolbar) return;
            let toggle = toolbar.querySelector(':scope > .section-menu-toggle');
            if (!toggle) {
                toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'section-menu-toggle';
                toggle.setAttribute('data-testid', 'section-menu-toggle');
                toggle.setAttribute('aria-haspopup', 'menu');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', 'Section actions');
                toggle.title = 'Section actions';
                toggle.textContent = '⋮';
                toolbar.appendChild(toggle);
            }
            let menu = heading.querySelector(':scope > .section-menu');
            if (!menu) {
                menu = createSectionMenu();
                menu.setAttribute('role', 'menu');
                heading.appendChild(menu);
            }
            toolbar.querySelector(':scope > .delete-btn[data-delete-type="section"]')?.remove();
            if (!menu.querySelector(':scope > .delete-btn[data-delete-type="section"]')) {
                const deleteItem = createDeleteButton('section', 'Delete Section', 'delete-section');
                deleteItem.classList.add('section-menu-item', 'section-menu-delete');
                menu.appendChild(deleteItem);
            }
        });
    }

    function normalizeDocument(root = document.getElementById('app-root')) {
        if (!root) return;
        removeLegacyContentDragHandles(root);
        ensureSectionAddEntryTopButtons(root);
        ensureContainerCollapseControls(root);
        ensureSectionMenus(root);
        enhanceEntries(root);
        syncContainerDepths();
    }

    return {
        isContainerNode,
        getDirectChildEntries,
        getDirectChildContainers,
        getContainerTitleText,
        ensureContainerDomId,
        ensureDomId,
        removeLegacyContentDragHandles,
        syncContainerCollapseState,
        normalizeDocument,
    };
}
