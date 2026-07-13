import { test, expect } from '@playwright/test';
import {
  addInitShims,
  enableEditing,
  fileUrl,
  makeTempClippingsCopy,
  setContentEditableText,
} from './helpers.mjs';

test('the same document can only be edited by one tab at a time', async ({ page, context }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  const secondPage = await context.newPage();
  try {
    await addInitShims(page, { fileId: temp.path });
    await addInitShims(secondPage, { fileId: temp.path });
    await page.goto(fileUrl(temp.path));
    await secondPage.goto(fileUrl(temp.path));

    await enableEditing(page);
    await secondPage.getByTestId('enable-edit-btn').click();
    await expect(secondPage.locator('body')).not.toHaveClass(/is-editing/);
    await expect(secondPage.getByTestId('save-status')).toContainText('another tab is editing');
  } finally {
    await secondPage.close();
    await page.close();
    temp.cleanup();
  }
});

test('different documents can be edited independently', async ({ page, context }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const first = makeTempClippingsCopy(sourceHtmlPath);
  const second = makeTempClippingsCopy(sourceHtmlPath);
  const secondPage = await context.newPage();
  try {
    await addInitShims(page, { fileId: first.path });
    await addInitShims(secondPage, { fileId: second.path });
    await page.goto(fileUrl(first.path));
    await secondPage.goto(fileUrl(second.path));

    await enableEditing(page);
    await enableEditing(secondPage);

    await page.getByTestId('main-title').click();
    await setContentEditableText(page.getByTestId('main-title'), 'First document');
    await secondPage.getByTestId('main-title').click();
    await setContentEditableText(secondPage.getByTestId('main-title'), 'Second document');

    await expect.poll(() => page.evaluate(() => window.__clippings_test_lastWrittenHtml || ''))
      .toContain('First document');
    await expect.poll(() => secondPage.evaluate(() => window.__clippings_test_lastWrittenHtml || ''))
      .toContain('Second document');
    expect(await page.evaluate(() => window.__clippings_test_lastWrittenHtml || ''))
      .not.toContain('Second document');
    expect(await secondPage.evaluate(() => window.__clippings_test_lastWrittenHtml || ''))
      .not.toContain('First document');
  } finally {
    await secondPage.close();
    await page.close({ runBeforeUnload: true });
    first.cleanup();
    second.cleanup();
  }
});

test('closing an editing tab releases only that document lock', async ({ page, context }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const temp = makeTempClippingsCopy(sourceHtmlPath);
  const secondPage = await context.newPage();
  try {
    await addInitShims(page, { fileId: temp.path });
    await addInitShims(secondPage, { fileId: temp.path });
    await page.goto(fileUrl(temp.path));
    await secondPage.goto(fileUrl(temp.path));

    await enableEditing(page);
    await page.close();
    await enableEditing(secondPage);
  } finally {
    await secondPage.close();
    temp.cleanup();
  }
});

test('resetting one document does not affect another document', async ({ page, context }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const first = makeTempClippingsCopy(sourceHtmlPath);
  const second = makeTempClippingsCopy(sourceHtmlPath);
  const secondPage = await context.newPage();
  try {
    await addInitShims(page, { fileId: first.path });
    await addInitShims(secondPage, { fileId: second.path });
    await page.goto(fileUrl(first.path));
    await secondPage.goto(fileUrl(second.path));
    await enableEditing(page);
    await enableEditing(secondPage);

    await page.getByTestId('add-section').click();
    await setContentEditableText(
      page.locator('[data-testid="section-title"]').first(),
      'Document One Data'
    );
    await secondPage.getByTestId('add-section').click();
    await setContentEditableText(
      secondPage.locator('[data-testid="section-title"]').first(),
      'Document Two Data'
    );

    await page.getByTestId('reset-btn').click();
    const resetTitle = await page.getByTestId('main-title').textContent();
    await page.locator('#reset-confirm-input').fill(resetTitle.trim());
    await page.locator('#confirm-reset-btn').click();

    await expect(page.locator('[data-testid="app-root"] .section')).toHaveCount(0);
    await expect(secondPage.locator('[data-testid="app-root"] .section')).toHaveCount(1);
    await expect(secondPage.locator('[data-testid="section-title"]')).toHaveText('Document Two Data');
    await expect.poll(() => secondPage.evaluate(() => window.__clippings_test_lastWrittenHtml || ''))
      .toContain('Document Two Data');
  } finally {
    await secondPage.close();
    await page.close();
    first.cleanup();
    second.cleanup();
  }
});
