import { test, expect } from '@playwright/test';
import {
  addInitShims,
  addSectionEntry,
  dragTocItem,
  enableEditing,
  fileUrl,
  makeTempClippingsCopy,
  selectorForTocItem,
  setContentEditableText,
} from './helpers.mjs';

test('dragging TOC section reorders document sections', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    const addSection = page.getByTestId('add-section');
    await addSection.click();
    await addSection.click();
    await addSection.click();

    const sectionTitles = page.locator('[data-testid="app-root"] .section [data-testid="section-title"]');
    await expect(sectionTitles).toHaveCount(3);
    await setContentEditableText(sectionTitles.nth(0), 'A');
    await setContentEditableText(sectionTitles.nth(1), 'B');
    await setContentEditableText(sectionTitles.nth(2), 'C');

    const tocSections = page.locator('[data-testid="toc"] li[data-testid="toc-item"][data-toc-type="section"]');
    await expect(tocSections).toHaveCount(3);

    // Move A after C.
  const sourceSel = await selectorForTocItem(page, { type: 'section', text: 'A' });
  const targetSel = await selectorForTocItem(page, { type: 'section', text: 'C' });
    await dragTocItem(page, sourceSel, targetSel, 'after');

    const titlesAfter = await page.locator('[data-testid="app-root"] .section .section-title').allTextContents();
    expect(titlesAfter.map((t) => t.trim())).toEqual(['B', 'C', 'A']);
  } finally {
    temp.cleanup();
  }
});

test('dragging TOC entry reorders entries within a section', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.locator('[data-testid="section-title"]'), 'S1');

    // Add 3 entries at section root.
    await addSectionEntry(section);
    await addSectionEntry(section);
    await addSectionEntry(section);

    const entryTitles = section.locator(':scope > .entry [data-testid="entry-title"]');
    await expect(entryTitles).toHaveCount(3);
    await setContentEditableText(entryTitles.nth(0), 'E1');
    await setContentEditableText(entryTitles.nth(1), 'E2');
    await setContentEditableText(entryTitles.nth(2), 'E3');

    // Show entries in TOC.
    await page.getByTestId('toc-level-btn').click();

    const tocEntries = page.locator('[data-testid="toc"] li[data-testid="toc-item"][data-toc-type="entry"][data-parent-id^="sec-"]');
    await expect(tocEntries).toHaveCount(3);

    // Move E1 after E3.
  const sourceSel = await selectorForTocItem(page, { type: 'entry', text: 'E1' });
  const targetSel = await selectorForTocItem(page, { type: 'entry', text: 'E3' });
    await dragTocItem(page, sourceSel, targetSel, 'after');

    const titlesAfter = await section.locator(':scope > .entry .entry-title').allTextContents();
    expect(titlesAfter.map((t) => t.trim())).toEqual(['E2', 'E3', 'E1']);
  } finally {
    temp.cleanup();
  }
});

test('section menu inserts sections above and below', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'Middle');

    await section.getByTestId('section-menu-toggle').click();
    await expect(section.getByTestId('section-menu-item').filter({ hasText: 'Add Section Above' })).toBeVisible();
    await expect(section.getByTestId('delete-section')).toBeVisible();
    await page.getByTestId('main-title').click();
    await expect(section.getByTestId('delete-section')).toBeHidden();
    await section.getByTestId('section-menu-toggle').click();
    await section.getByTestId('section-menu-item').filter({ hasText: 'Add Section Above' }).click();
    await setContentEditableText(page.locator('[data-testid="app-root"] .section').first().getByTestId('section-title'), 'Above');

    const middle = page.locator('[data-testid="app-root"] .section').filter({ hasText: 'Middle' }).first();
    await middle.getByTestId('section-menu-toggle').click();
    await middle.getByTestId('section-menu-item').filter({ hasText: 'Add Section Below' }).click();
    await setContentEditableText(page.locator('[data-testid="app-root"] .section').nth(2).getByTestId('section-title'), 'Below');

    await expect(page.locator('[data-testid="app-root"] > .section .section-title')).toHaveText(['Above', 'Middle', 'Below']);
  } finally {
    temp.cleanup();
  }
});
