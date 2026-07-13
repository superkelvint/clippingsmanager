export function createToc({ state, els, isContainerNode, getDirectChildContainers, getContainerTitleText, ensureContainerDomId, ensureDomId }) {
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

    function createTocEntryItem(entry, parentTargetId) {
        ensureDomId(entry, 'entry');
        const rawTitle = entry.querySelector('.entry-title')?.textContent || '';
        const entryItem = document.createElement('li');
        entryItem.classList.add('draggable');
        entryItem.setAttribute('data-testid', 'toc-item');
        entryItem.dataset.tocType = 'entry';
        entryItem.dataset.targetId = entry.id;
        entryItem.dataset.parentId = parentTargetId || '';
        const row = document.createElement('span');
        row.className = 'toc-row';
        row.appendChild(createTocDragHandle());
        const link = document.createElement('a');
        link.href = `#${entry.id}`;
        link.textContent = rawTitle.trim() || 'Untitled Entry';
        row.appendChild(link);
        entryItem.appendChild(row);
        return entryItem;
    }

    function createTocContainerItem(container, parentTargetId) {
        const containerId = ensureContainerDomId(container);
        const item = document.createElement('li');
        item.classList.add('draggable');
        item.setAttribute('data-testid', 'toc-item');
        item.dataset.tocType = container.classList.contains('section') ? 'section' : 'subsection';
        item.dataset.targetId = containerId;
        item.dataset.parentId = parentTargetId || '';
        const row = document.createElement('span');
        row.className = 'toc-row';
        row.appendChild(createTocDragHandle());
        const link = document.createElement('a');
        link.href = `#${containerId}`;
        link.textContent = getContainerTitleText(container);
        if (container.classList.contains('section')) {
            const strong = document.createElement('strong');
            strong.appendChild(link);
            row.appendChild(strong);
        } else {
            row.appendChild(link);
        }
        item.appendChild(row);
        return item;
    }

    function appendContainerChildrenToToc(container, containerItem) {
        const childrenList = document.createElement('ul');
        const parentTargetId = ensureContainerDomId(container);
        Array.from(container.children).forEach((child) => {
            if (isContainerNode(child)) {
                const childItem = createTocContainerItem(child, parentTargetId);
                appendContainerChildrenToToc(child, childItem);
                childrenList.appendChild(childItem);
            } else if (child.matches('.entry') && state.tocIncludeEntries) {
                childrenList.appendChild(createTocEntryItem(child, parentTargetId));
            }
        });
        if (childrenList.children.length > 0) containerItem.appendChild(childrenList);
    }

    function generateTOC() {
        const toc = document.getElementById('toc');
        const topList = document.createElement('ul');
        const appRoot = document.getElementById('app-root');
        getDirectChildContainers(appRoot).forEach((container) => {
            const containerItem = createTocContainerItem(container, 'app-root');
            appendContainerChildrenToToc(container, containerItem);
            topList.appendChild(containerItem);
        });
        toc.replaceChildren(topList);
        els.tocDrawerList?.replaceChildren(topList.cloneNode(true));
    }

    return { generateTOC };
}
