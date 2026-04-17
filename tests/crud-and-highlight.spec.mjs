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
    const swatchColor = await firstSwatch.evaluate((el) => el.dataset.color || el.style.backgroundColor || '');
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

test('tags autocomplete from existing tags and participate in search', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'Tagged Section');

    await section.getByTestId('add-entry').click();
    await section.getByTestId('add-entry').click();

    const entries = section.locator(':scope > .entry');
    await expect(entries).toHaveCount(2);

    const firstEntry = entries.nth(0);
    const secondEntry = entries.nth(1);

    await setContentEditableText(firstEntry.getByTestId('entry-title'), 'First Entry');
    await setContentEditableText(secondEntry.getByTestId('entry-title'), 'Second Entry');
    await setContentEditableText(firstEntry.getByTestId('entry-text'), 'Alpha body');
    await setContentEditableText(secondEntry.getByTestId('entry-text'), 'Beta body');

    await firstEntry.getByTestId('entry-tag-edit-toggle').click();
    const firstTagInput = firstEntry.getByTestId('entry-tag-input');
    await firstTagInput.fill('AI');
    await firstTagInput.press('Enter');
    await expect(firstEntry.getByTestId('entry-tag-label')).toHaveText(['AI']);
    await firstEntry.getByTestId('entry-tag-done').click();
    await expect(firstEntry.getByTestId('entry-tag-row')).toHaveAttribute('data-editing-tags', 'false');

    const knownTags = page.locator('#known-tag-options option');
    await expect(knownTags).toHaveCount(1);
    await expect(knownTags.first()).toHaveAttribute('value', 'AI');

    await secondEntry.getByTestId('entry-tag-edit-toggle').click();
    const secondTagInput = secondEntry.getByTestId('entry-tag-input');
    await secondTagInput.fill('A');
    await secondTagInput.press('ArrowDown');
    await secondTagInput.press('Enter');
    await expect(secondEntry.getByTestId('entry-tag-label')).toHaveText(['AI']);

    await secondTagInput.fill('AI');
    await secondTagInput.press('Enter');
    await expect(secondEntry.getByTestId('entry-tag-label')).toHaveText(['AI']);

    await secondTagInput.fill('Research');
    await secondTagInput.press('Enter');
    await expect(secondEntry.getByTestId('entry-tag-label')).toHaveText(['AI', 'Research']);
    await secondEntry.getByTestId('entry-tag-done').click();
    await expect(knownTags).toHaveCount(2);

    const search = page.getByTestId('entry-search');
    await search.fill('AI');
    await expect(firstEntry).toBeVisible();
    await expect(secondEntry).toBeVisible();

    await search.fill('tag:Research');
    await expect(firstEntry).toBeHidden();
    await expect(secondEntry).toBeVisible();

    await secondEntry.getByTestId('entry-tag-edit-toggle').click();
    await secondEntry.getByTestId('entry-tag-remove').first().click();
    await expect(secondEntry.getByTestId('entry-tag-label')).toHaveText(['Research']);
    await secondEntry.getByTestId('entry-tag-done').click();
    await expect(knownTags).toHaveCount(2);

    await search.fill('');
    await firstEntry.getByTestId('entry-tag-edit-toggle').click();
    await firstEntry.getByTestId('entry-tag-remove').click();
    await expect(firstEntry.getByTestId('entry-tag')).toHaveCount(0);
    await firstEntry.getByTestId('entry-tag-done').click();
    await expect(knownTags).toHaveCount(1);
    await expect(knownTags.first()).toHaveAttribute('value', 'Research');
  } finally {
    temp.cleanup();
  }
});

test('tag search also covers quoted tags plus title and source matches', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'Search Section');

    await section.getByTestId('add-entry').click();
    await section.getByTestId('add-entry').click();

    const firstEntry = section.locator(':scope > .entry').nth(0);
    const secondEntry = section.locator(':scope > .entry').nth(1);

    await setContentEditableText(firstEntry.getByTestId('entry-title'), 'Multi Word Title');
    await setContentEditableText(firstEntry.getByTestId('entry-source'), 'Source Alpha');
    await setContentEditableText(firstEntry.getByTestId('entry-text'), 'Body one');
    await firstEntry.getByTestId('entry-tag-edit-toggle').click();
    await firstEntry.getByTestId('entry-tag-input').fill('Machine Learning');
    await firstEntry.getByTestId('entry-tag-add').click();
    await firstEntry.getByTestId('entry-tag-done').click();

    await setContentEditableText(secondEntry.getByTestId('entry-title'), 'Other Title');
    await setContentEditableText(secondEntry.getByTestId('entry-source'), 'Source Beta');
    await setContentEditableText(secondEntry.getByTestId('entry-text'), 'Body two');

    const search = page.getByTestId('entry-search');

    await search.fill('"multi word"');
    await expect(firstEntry).toBeVisible();
    await expect(secondEntry).toBeHidden();

    await search.fill('alpha');
    await expect(firstEntry).toBeVisible();
    await expect(secondEntry).toBeHidden();

    await search.fill('tag:"Machine Learning"');
    await expect(firstEntry).toBeVisible();
    await expect(secondEntry).toBeHidden();
  } finally {
    temp.cleanup();
  }
});

test('buildSavableHtml preserves tags and clears unsaved tag input draft text', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'Save Section');
    await section.getByTestId('add-entry').click();

    const entry = section.locator(':scope > .entry').first();
    await setContentEditableText(entry.getByTestId('entry-title'), 'Save Entry');
    await entry.getByTestId('entry-tag-edit-toggle').click();
    await entry.getByTestId('entry-tag-input').fill('Persistent Tag');
    await entry.getByTestId('entry-tag-add').click();
    await entry.getByTestId('entry-tag-input').fill('Draft Only');
    await entry.getByTestId('entry-tag-done').click();

    const savedHtml = await page.evaluate(() => buildSavableHtml());
    expect(savedHtml).toContain('Persistent Tag');
    expect(savedHtml).not.toContain('Draft Only');
    expect(savedHtml).toContain('data-tags="[&quot;Persistent Tag&quot;]"');
  } finally {
    temp.cleanup();
  }
});

test('tag editor stays collapsed until requested and done closes it after saving tags', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'Toggle Section');
    await section.getByTestId('add-entry').click();

    const entry = section.locator(':scope > .entry').first();
    await expect(entry.getByTestId('entry-tag-row')).toHaveAttribute('data-editing-tags', 'false');
    await expect(entry.getByTestId('entry-tag-edit-toggle')).toHaveText('Add Tags');

    await entry.getByTestId('entry-tag-edit-toggle').click();
    await expect(entry.getByTestId('entry-tag-row')).toHaveAttribute('data-editing-tags', 'true');
    await entry.getByTestId('entry-tag-input').fill('Visible Later');
    await entry.getByTestId('entry-tag-add').click();
    await entry.getByTestId('entry-tag-done').click();

    await expect(entry.getByTestId('entry-tag-row')).toHaveAttribute('data-editing-tags', 'false');
    await expect(entry.getByTestId('entry-tag-label')).toHaveText(['Visible Later']);

    const savedHtml = await page.evaluate(() => buildSavableHtml());
    expect(savedHtml).toContain('Visible Later');
  } finally {
    temp.cleanup();
  }
});

test('different tags receive stable distinct chip colors', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'Color Section');
    await section.getByTestId('add-entry').click();

    const entry = section.locator(':scope > .entry').first();
    await entry.getByTestId('entry-tag-edit-toggle').click();
    await entry.getByTestId('entry-tag-input').fill('Research');
    await entry.getByTestId('entry-tag-add').click();
    await entry.getByTestId('entry-tag-input').fill('Strategy');
    await entry.getByTestId('entry-tag-add').click();
    await entry.getByTestId('entry-tag-done').click();

    const firstTag = entry.getByTestId('entry-tag').nth(0);
    const secondTag = entry.getByTestId('entry-tag').nth(1);

    const firstIndex = await firstTag.getAttribute('data-tag-color-index');
    const secondIndex = await secondTag.getAttribute('data-tag-color-index');
    expect(firstIndex).not.toBeNull();
    expect(secondIndex).not.toBeNull();
    expect(firstIndex).not.toBe(secondIndex);

    const firstBg = await firstTag.evaluate((el) => el.style.getPropertyValue('--tag-bg'));
    const secondBg = await secondTag.evaluate((el) => el.style.getPropertyValue('--tag-bg'));
    expect(firstBg).not.toBe('');
    expect(secondBg).not.toBe('');
    expect(firstBg).not.toBe(secondBg);
  } finally {
    temp.cleanup();
  }
});

test('search tag list shows counts and supports plain, ctrl/cmd, and shift click filtering', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.goto(fileUrl(temp.path));
    await enableEditing(page);

    await page.getByTestId('add-section').click();
    const section = page.locator('[data-testid="app-root"] .section').first();
    await setContentEditableText(section.getByTestId('section-title'), 'Filter Section');

    await section.getByTestId('add-entry').click();
    await section.getByTestId('add-entry').click();
    await section.getByTestId('add-entry').click();

    const firstEntry = section.locator(':scope > .entry').nth(0);
    const secondEntry = section.locator(':scope > .entry').nth(1);
    const thirdEntry = section.locator(':scope > .entry').nth(2);

    await setContentEditableText(firstEntry.getByTestId('entry-title'), 'Entry One');
    await setContentEditableText(secondEntry.getByTestId('entry-title'), 'Entry Two');
    await setContentEditableText(thirdEntry.getByTestId('entry-title'), 'Entry Three');

    await firstEntry.getByTestId('entry-tag-edit-toggle').click();
    await firstEntry.getByTestId('entry-tag-input').fill('AI');
    await firstEntry.getByTestId('entry-tag-add').click();
    await firstEntry.getByTestId('entry-tag-done').click();

    await secondEntry.getByTestId('entry-tag-edit-toggle').click();
    await secondEntry.getByTestId('entry-tag-input').fill('AI');
    await secondEntry.getByTestId('entry-tag-add').click();
    await secondEntry.getByTestId('entry-tag-done').click();

    await thirdEntry.getByTestId('entry-tag-edit-toggle').click();
    await thirdEntry.getByTestId('entry-tag-input').fill('Research');
    await thirdEntry.getByTestId('entry-tag-add').click();
    await thirdEntry.getByTestId('entry-tag-input').fill('AI');
    await thirdEntry.getByTestId('entry-tag-add').click();
    await thirdEntry.getByTestId('entry-tag-done').click();

    const filters = page.getByTestId('search-tag-filter');
    await expect(filters).toHaveCount(2);
    await expect(filters.nth(0)).toHaveText('AI (3)');
    await expect(filters.nth(1)).toHaveText('Research (1)');
    await expect(page.getByTestId('search-tag-filters-help')).toBeVisible();
    await expect(page.getByTestId('search-tag-filters-help')).toHaveText('Click a tag to filter. Ctrl/Cmd-click adds tags with OR. Shift-click adds tags with AND.');

    await filters.nth(0).click();
    await expect(filters.nth(0)).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('search-tag-filters-help')).toContainText('Filtering by ANY selected tags');
    await expect(firstEntry).toBeVisible();
    await expect(secondEntry).toBeVisible();
    await expect(thirdEntry).toBeVisible();

    await filters.nth(0).click();
    await expect(filters.nth(0)).not.toHaveAttribute('data-active', 'true');
    await expect(firstEntry).toBeVisible();
    await expect(secondEntry).toBeVisible();
    await expect(thirdEntry).toBeVisible();

    await filters.nth(0).click({ modifiers: ['Control'] });
    await filters.nth(1).click({ modifiers: ['Control'] });
    await expect(filters.nth(0)).toHaveAttribute('data-active', 'true');
    await expect(filters.nth(1)).toHaveAttribute('data-active', 'true');
    await expect(page.getByTestId('search-tag-filters-help')).toContainText('Filtering by ANY selected tags');
    await expect(firstEntry).toBeVisible();
    await expect(secondEntry).toBeVisible();
    await expect(thirdEntry).toBeVisible();

    await page.getByTestId('entry-search').press('Escape');
    await filters.nth(0).click();
    await filters.nth(1).click({ modifiers: ['Shift'] });
    await expect(page.getByTestId('search-tag-filters-help')).toContainText('Filtering by ALL selected tags');
    await expect(firstEntry).toBeHidden();
    await expect(secondEntry).toBeHidden();
    await expect(thirdEntry).toBeVisible();

    await section.getByTestId('add-entry').click();
    const fourthEntry = section.locator(':scope > .entry').nth(3);
    await expect(page.getByTestId('entry-search')).toHaveValue('');
    await expect(filters.nth(0)).not.toHaveAttribute('data-active', 'true');
    await expect(filters.nth(1)).not.toHaveAttribute('data-active', 'true');
    await expect(fourthEntry).toBeVisible();
    await expect(fourthEntry.getByTestId('entry-title')).toBeFocused();
  } finally {
    temp.cleanup();
  }
});
