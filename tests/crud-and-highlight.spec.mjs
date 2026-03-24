import { test, expect } from '@playwright/test';
import {
  addInitShims,
  dragTocItem,
  enableEditing,
  fileUrl,
  makeTempClippingsCopy,
  selectorForTocItem,
  selectTextBySubstring,
  setContentEditableText,
} from './helpers.mjs';

test('add/delete sections, subsections, entries updates DOM and TOC', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    const addSection = page.getByTestId('add-section');
    await addSection.click();
    await addSection.click();

    const sections = page.locator('[data-testid="app-root"] .section');
    await expect(sections).toHaveCount(2);

    await setContentEditableText(sections.nth(0).getByTestId('section-title'), 'S1');
    await setContentEditableText(sections.nth(1).getByTestId('section-title'), 'S2');

    // In S1: add subsection and entries.
    const s1 = sections.nth(0);
    await s1.getByTestId('add-subsection').click();
    const subsections = s1.locator(':scope > .subsection-group');
    await expect(subsections).toHaveCount(1);
    await setContentEditableText(subsections.first().getByTestId('subsection-title'), 'Sub1');

    // Add one entry in subsection and one entry at section root.
    await subsections.first().getByTestId('add-entry').click();
    // Avoid strict-mode ambiguity: section also contains nested add-entry buttons inside subsections.
    await s1.locator(':scope > [data-testid="add-entry"]').click();

    const subEntries = subsections.first().locator(':scope > .entry');
    const rootEntries = s1.locator(':scope > .entry');
    await expect(subEntries).toHaveCount(1);
    await expect(rootEntries).toHaveCount(1);
    await setContentEditableText(subEntries.first().getByTestId('entry-title'), 'E1');
    await setContentEditableText(rootEntries.first().getByTestId('entry-title'), 'Eroot');

    // Show entries in TOC and assert key items exist.
    await page.getByTestId('toc-level-btn').click();
    await expect(page.getByTestId('toc')).toContainText('S1');
    await expect(page.getByTestId('toc')).toContainText('Sub1');
    await expect(page.getByTestId('toc')).toContainText('E1');
    await expect(page.getByTestId('toc')).toContainText('Eroot');
    await expect(page.getByTestId('toc')).toContainText('S2');

    // Delete Eroot.
    await rootEntries.first().getByTestId('delete-entry').click();
    await expect(s1.locator(':scope > .entry')).toHaveCount(0);
    await expect(page.getByTestId('toc')).not.toContainText('Eroot');

    // Delete Sub1 (should remove its entry too).
    await subsections.first().getByTestId('delete-subsection').click();
    await expect(s1.locator(':scope > .subsection-group')).toHaveCount(0);
    await expect(page.getByTestId('toc')).not.toContainText('Sub1');
    await expect(page.getByTestId('toc')).not.toContainText('E1');

    // Delete S2.
    await sections.nth(1).getByTestId('delete-section').click();
    await expect(page.locator('[data-testid="app-root"] .section')).toHaveCount(1);
    await expect(page.getByTestId('toc')).not.toContainText('S2');
  } finally {
    temp.cleanup();
  }
});

test('dragging TOC subsection reorders subsections within a section', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'S1');

    await section.getByTestId('add-subsection').click();
    await section.getByTestId('add-subsection').click();
    const subs = section.locator(':scope > .subsection-group');
    await expect(subs).toHaveCount(2);
    await setContentEditableText(subs.nth(0).getByTestId('subsection-title'), 'SubA');
    await setContentEditableText(subs.nth(1).getByTestId('subsection-title'), 'SubB');

    const sourceSel = await selectorForTocItem(page, { type: 'subsection', text: 'SubA' });
    const targetSel = await selectorForTocItem(page, { type: 'subsection', text: 'SubB' });
    await dragTocItem(page, sourceSel, targetSel, 'after');

    const titlesAfter = await section.locator(':scope > .subsection-group .subsection-title').allTextContents();
    expect(titlesAfter.map((t) => t.trim())).toEqual(['SubB', 'SubA']);
  } finally {
    temp.cleanup();
  }
});

test('highlight: add palette color, apply highlight, recolor, and remove', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    // Add entry with some text to highlight.
    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'S1');
    await section.getByTestId('add-entry').click();
    const entry = section.locator(':scope > .entry').first();
    await setContentEditableText(entry.getByTestId('entry-title'), 'E1');
    const textEditor = entry.getByTestId('entry-text');
    await setContentEditableText(textEditor, 'Hello world');

    // Open highlight panel and add a new palette color.
    await page.getByTestId('highlight-toggle-btn').click();
    await expect(page.getByTestId('highlight-panel')).toBeVisible();

    const paletteInputs = page.getByTestId('highlight-panel').getByTestId('palette-color-input');
    const initialCount = await paletteInputs.count();
    await page.getByTestId('add-highlight-color').click();
    await expect(paletteInputs).toHaveCount(initialCount + 1);

    // Set first palette color to red and ensure popup swatch updates.
    await paletteInputs.first().evaluate((el) => {
      el.value = '#ff0000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Select "Hello" to show popup and apply highlight using the first swatch.
    await selectTextBySubstring(page, textEditor, 'Hello');
    const popup = page.getByTestId('highlight-popup');
    await expect(popup).toBeVisible();

    const firstSwatch = popup.getByTestId('highlight-swatch').first();
    const swatchColor = await firstSwatch.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(swatchColor).toBe('rgb(255, 0, 0)');
    await firstSwatch.dispatchEvent('mousedown');

    const mark = textEditor.getByTestId('highlight-mark');
    await expect(mark).toHaveCount(1);
    await expect(mark).toContainText('Hello');

    const markColor1 = await mark.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(markColor1).toBe('rgb(255, 0, 0)');

    // Changing a palette color should update all existing highlights of that color.
    await paletteInputs.first().evaluate((el) => {
      el.value = '#00ff00';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(mark).toHaveCount(1);
    const markColorAfterPaletteChange = await mark.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(markColorAfterPaletteChange).toBe('rgb(0, 255, 0)');

    // Click mark to get popup with "Unhighlight" and recolor using the second swatch.
    await mark.click();
    await expect(popup).toBeVisible();
    await expect(popup.getByTestId('highlight-unhighlight')).toHaveCount(1);
    const secondSwatch = popup.getByTestId('highlight-swatch').nth(1);
    await secondSwatch.dispatchEvent('mousedown');
    const markColor2 = await mark.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(markColor2).not.toBe(markColorAfterPaletteChange);

    // Remove highlight.
    const unhighlight = popup.getByTestId('highlight-unhighlight');
    await expect(unhighlight).toHaveCount(1);
    if (!(await popup.isVisible())) {
      await mark.click();
      await expect(popup).toBeVisible();
    }
    await unhighlight.click({ force: true });
    await expect(textEditor.getByTestId('highlight-mark')).toHaveCount(0);
  } finally {
    temp.cleanup();
  }
});
