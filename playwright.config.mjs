import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const useChannel = process.env.PW_CHROME_CHANNEL || 'chrome';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    headless: true,
    channel: useChannel,
    viewport: { width: 1200, height: 900 },
    // Helpful when debugging locally:
    // trace: 'on-first-retry',
  },
  // Make it easy to navigate to the single-file app from tests.
  metadata: {
    clippingsHtmlPath: resolve(process.cwd(), 'clippings.html')
  }
});

