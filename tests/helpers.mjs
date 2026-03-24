import { expect } from '@playwright/test';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

export function fileUrl(path) {
  const abs = resolve(path);
  return `file://${abs}`;
}

export function makeTempClippingsCopy(sourcePath) {
  const dir = mkdtempSync(resolve(tmpdir(), 'clippings-e2e-'));
  const dest = resolve(dir, 'clippings.html');
  copyFileSync(sourcePath, dest);
  return {
    path: dest,
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

export async function addInitShims(page) {
  await page.addInitScript(() => {
    let storedHtml = '';
    Object.defineProperty(window, '__clippings_test_lastWrittenHtml', {
      configurable: true,
      get: () => storedHtml,
    });
    const fakeHandle = {
      async queryPermission() {
        return 'granted';
      },
      async getFile() {
        const html = storedHtml || '<!DOCTYPE html>' + document.documentElement.outerHTML;
        return new File([html], 'clippings.html', { type: 'text/html' });
      },
      async createWritable() {
        return {
          async write(content) {
            storedHtml = String(content);
          },
          async close() {}
        };
      }
    };

    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      writable: true,
      value: async () => [fakeHandle]
    });

    window.confirm = () => true;
  });
}

export async function enableEditing(page) {
  await page.getByTestId('enable-edit-btn').click();
  await expect(page.locator('body')).toHaveClass(/is-editing/);
}

export async function setContentEditableText(locator, text) {
  await locator.evaluate((el, value) => {
    el.focus();
    el.innerText = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  }, text);
}

export async function selectTextBySubstring(page, rootLocator, substring) {
  await rootLocator.evaluate((root, sub) => {
    const text = root.textContent || '';
    const idx = text.indexOf(sub);
    if (idx < 0) throw new Error(`Substring not found: ${sub}`);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let pos = 0;
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.textContent ? node.textContent.length : 0;
      const nextPos = pos + len;
      if (!startNode && idx >= pos && idx <= nextPos) {
        startNode = node;
        startOffset = idx - pos;
      }
      const endIdx = idx + sub.length;
      if (!endNode && endIdx >= pos && endIdx <= nextPos) {
        endNode = node;
        endOffset = endIdx - pos;
      }
      pos = nextPos;
      if (startNode && endNode) break;
    }
    if (!startNode || !endNode) throw new Error('Could not resolve selection range');

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, substring);
}

export async function dragTocItem(page, sourceSelector, targetSelector, where = 'after') {
  await page.evaluate(([sourceSel, targetSel, whereArg]) => {
    const source = document.querySelector(sourceSel);
    const target = document.querySelector(targetSel);
    if (!source) throw new Error(`Missing source: ${sourceSel}`);
    if (!target) throw new Error(`Missing target: ${targetSel}`);
    const handle = source.querySelector('[data-testid="toc-drag-handle"]');
    if (!handle) throw new Error('Missing toc drag handle');

    const rect = target.getBoundingClientRect();
    const y = whereArg === 'before' ? rect.top + 2 : rect.bottom - 2;
    const dt = new DataTransfer();

    handle.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
    handle.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, [sourceSelector, targetSelector, where]);
}

export async function selectorForTocItem(page, { type, text }) {
  const locator = page
    .locator(`[data-testid="toc"] li[data-testid="toc-item"][data-toc-type="${type}"]`)
    .filter({ hasText: text })
    .first();
  await expect(locator).toHaveCount(1);
  const targetId = await locator.getAttribute('data-target-id');
  if (!targetId) throw new Error(`Missing data-target-id for TOC item: ${type} ${text}`);
  return `[data-testid="toc"] li[data-testid="toc-item"][data-toc-type="${type}"][data-target-id="${targetId}"]`;
}
