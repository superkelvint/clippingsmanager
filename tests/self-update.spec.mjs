import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { addInitShims, fileUrl, makeTempClippingsCopy } from './helpers.mjs';

function extractBuildSha(html) {
  const match = String(html).match(/<meta\s+name="clippings-build-sha"\s+content="([^"]+)"/i);
  return match ? match[1] : '';
}

function makeUpstreamHtml({ localHtml, remoteSha }) {
  const localSha = extractBuildSha(localHtml);
  if (!localSha) throw new Error('Missing clippings-build-sha in local HTML');
  return String(localHtml)
    .replace(`name="clippings-build-sha" content="${localSha}"`, `name="clippings-build-sha" content="${remoteSha}"`)
    .replace('v0.1.0', 'v9.9.9');
}

test('self-update: "Not now" ignores that upstream commit globally', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const localHtml = readFileSync(sourceHtmlPath, 'utf8');
  const remoteSha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
  const upstreamHtml = makeUpstreamHtml({ localHtml, remoteSha });

  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    await addInitShims(page);
    await page.addInitScript((htmlText) => {
      window.fetch = async () => ({
        ok: true,
        status: 200,
        async text() {
          return htmlText;
        }
      });
    }, upstreamHtml);

    await page.goto(fileUrl(temp.path));

    const modal = page.getByTestId('update-modal');
    await expect(modal).toBeVisible();
    await page.getByTestId('update-not-now-btn').click();
    await expect(modal).toBeHidden();

    await page.reload();
    await expect(modal).toBeHidden();
  } finally {
    temp.cleanup();
  }
});

test('self-update: Update merges user content into upstream template', async ({ page }, testInfo) => {
  const sourceHtmlPath = testInfo.config.metadata.clippingsHtmlPath;
  const localHtml = readFileSync(sourceHtmlPath, 'utf8');
  const remoteSha = 'feedfacefeedfacefeedfacefeedfacefeedface';
  const upstreamHtml = makeUpstreamHtml({ localHtml, remoteSha });

  const temp = makeTempClippingsCopy(sourceHtmlPath);
  try {
    const existing = readFileSync(temp.path, 'utf8');
    const withTitle = existing.replace(
      /(<h1[^>]*\sid="main-title"[^>]*>)([\s\S]*?)(<\/h1>)/i,
      `$1My Doc$3`
    );
    const withContent = withTitle.replace(
      /(<main[^>]*\sid="app-root"[^>]*>)(<\/main>)/i,
      `$1<div data-testid="user-marker">Hello update</div>$2`
    );
    writeFileSync(temp.path, withContent);

    await addInitShims(page);
    await page.addInitScript((htmlText) => {
      window.__clippings_test_disable_reload = true;
      window.fetch = async () => ({
        ok: true,
        status: 200,
        async text() {
          return htmlText;
        }
      });
    }, upstreamHtml);

    await page.goto(fileUrl(temp.path));
    await expect(page.getByTestId('update-modal')).toBeVisible();

    await page.getByTestId('update-now-btn').click();
    await page.waitForFunction(() => {
      return (window.__clippings_test_lastWrittenHtml || '').length > 0;
    });

    const written = await page.evaluate(() => window.__clippings_test_lastWrittenHtml);
    expect(written).toContain('My Doc');
    expect(written).toContain('data-testid="user-marker"');
    expect(written).toContain('Hello update');
    expect(written).toContain('v9.9.9');
    expect(written).toContain(remoteSha);
  } finally {
    temp.cleanup();
  }
});

