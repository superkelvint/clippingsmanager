USER root

# Shared browser cache path so all users can access the installed browser
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Playwright CLI + Chromium + Linux deps at image build time
RUN npm install -g --no-audit --no-fund playwright \
 && npx playwright install --with-deps chromium \
 && apt-get install -y --no-install-recommends python3-pytest \
 && chmod -R a+rX /ms-playwright

USER yolo