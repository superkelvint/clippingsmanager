#!/usr/bin/env sh
set -eu

if [ "${SKIP_CLIPPINGS_E2E:-}" = "1" ]; then
  echo "SKIP_CLIPPINGS_E2E=1 set; skipping clippings e2e tests."
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node not found; skipping clippings e2e tests."
  exit 0
fi

echo "Running clippings e2e tests..."

if ! node -e "require.resolve('@playwright/test')" >/dev/null 2>&1; then
  echo "@playwright/test not installed."
  echo "Install with: npm install"
  exit 1
fi

# Prefer installed Chrome via Playwright channel=chrome. Override with PW_CHROME_CHANNEL if needed.
# Use --no-install to avoid npx reaching out to the network.
npx --no-install playwright test
