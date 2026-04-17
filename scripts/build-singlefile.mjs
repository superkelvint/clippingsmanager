import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), '..');
const htmlPath = path.join(rootDir, 'clippings.html');
const jsPath = path.join(rootDir, 'src', 'clippings.js');

const beginMarker = '/* BEGIN_INLINE:src/clippings.js */';
const endMarker = '/* END_INLINE */';
const buildShaPlaceholder = '__CLIPPINGS_BUILD_SHA__';
const templateCommitPlaceholder = '__CLIPPINGS_TEMPLATE_COMMIT__';
const buildShaMetaRe = /(<meta\s+name=["']clippings-build-sha["']\s+content=["'])([^"']*)(["']\s*\/?>)/i;
const templateCommitMetaRe = /(<meta\s+name=["']clippings-template-commit["']\s+content=["'])([^"']*)(["']\s*\/?>)/i;
const titleRe = /(<title[^>]*>)([\s\S]*?)(<\/title>)/i;

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

function escapeScriptClose(js) {
  // Avoid accidentally terminating the script tag if user content ever includes </script>.
  return js.replace(/<\/script>/gi, '<\\/script>');
}

function shouldMinify() {
  if (process.env.CLIPPINGS_NO_MINIFY === '1') return false;
  if (process.argv.includes('--no-minify')) return false;
  return true;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function sanitizeHtmlForBuildId(html) {
  // Ensure the build id doesn't depend on the previous build id.
  // clippings.html is a generated artifact that already contains a value here.
  const normalized = normalizeNewlines(String(html));
  return normalized
    .replace(buildShaMetaRe, `$1${buildShaPlaceholder}$3`)
    .replace(templateCommitMetaRe, `$1${templateCommitPlaceholder}$3`);
}

function computeBuildId({ html, js }) {
  // Build id should reflect template source (HTML skeleton + src JS), not the git commit SHA.
  // This stays stable across commits/builds unless the actual template/JS changes.
  const safeHtml = sanitizeHtmlForBuildId(html);
  const beginIdx = safeHtml.indexOf(beginMarker);
  const endIdx = beginIdx === -1 ? -1 : safeHtml.indexOf(endMarker, beginIdx + beginMarker.length);
  const skeleton =
    beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx
      ? safeHtml
      : safeHtml.slice(0, beginIdx) + beginMarker + safeHtml.slice(endIdx);

  return sha256Hex(normalizeNewlines(skeleton) + '\n' + normalizeNewlines(js));
}

function getGitHeadCommitSha() {
  try {
    const sha = execSync('git rev-parse HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .trim();
    return sha || 'unknown';
  } catch {
    return 'unknown';
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTagInner(html, tagName, tagId) {
  const pattern = new RegExp(`<${tagName}[^>]*id=["']${escapeRegExp(tagId)}["'][^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = pattern.exec(String(html));
  return match ? match[1] : null;
}

function setTagInner(html, tagName, tagId, newInner) {
  const pattern = new RegExp(`(<${tagName}[^>]*id=["']${escapeRegExp(tagId)}["'][^>]*>)([\\s\\S]*?)(</${tagName}>)`, 'i');
  return String(html).replace(pattern, `$1${newInner}$3`);
}

function getTitle(html) {
  const match = titleRe.exec(String(html));
  return match ? match[2] : null;
}

function setTitle(html, newTitle) {
  return String(html).replace(titleRe, `$1${newTitle}$3`);
}

function getMetaContent(html, metaName) {
  const pattern = new RegExp(`<meta[^>]*name=["']${escapeRegExp(metaName)}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const match = pattern.exec(String(html));
  return match ? match[1] : '';
}

function setMetaContent(html, metaName, value) {
  const pattern = new RegExp(`(<meta[^>]*name=["']${escapeRegExp(metaName)}["'][^>]*content=["'])([^"']*)(["'][^>]*>)`, 'i');
  if (pattern.test(String(html))) {
    return String(html).replace(pattern, `$1${value}$3`);
  }

  const headCloseIdx = String(html).search(/<\/head>/i);
  if (headCloseIdx === -1) return String(html);
  const metaTag = `\n<meta name="${metaName}" content="${value}">`;
  return String(html).slice(0, headCloseIdx) + metaTag + String(html).slice(headCloseIdx);
}

function buildHtmlWithInlineJs({ htmlRaw, js, buildSha, templateCommit, filePath }) {
  const htmlOriginal = normalizeNewlines(htmlRaw);
  let html = htmlOriginal;
  // Keep supporting the placeholder (first-time insertion), but also continuously update the meta tag
  // on subsequent builds after the placeholder has been replaced.
  html = html.replaceAll(buildShaPlaceholder, buildSha);
  html = html.replaceAll(templateCommitPlaceholder, templateCommit);
  if (buildShaMetaRe.test(html)) {
    html = html.replace(buildShaMetaRe, `$1${buildSha}$3`);
  }
  if (templateCommitMetaRe.test(html)) {
    html = html.replace(templateCommitMetaRe, `$1${templateCommit}$3`);
  }

  const beginIdx = html.indexOf(beginMarker);
  const endIdx = beginIdx === -1 ? -1 : html.indexOf(endMarker, beginIdx + beginMarker.length);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
    throw new Error(`Could not find inline markers in ${filePath}`);
  }

  const insertStart = beginIdx + beginMarker.length;
  return {
    original: htmlOriginal,
    next:
      html.slice(0, insertStart) +
      // Preserve leading newline in src if present; don't force one here.
      js +
      html.slice(endIdx),
  };
}

function getCandidateHtmlCopies() {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      if (name === path.basename(htmlPath)) return false;
      if (!name.toLowerCase().endsWith('.html')) return false;
      return /^clippings\b/i.test(path.basename(name, '.html'));
    })
    .map((name) => path.join(rootDir, name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

async function shouldSyncHtmlCopies(copies) {
  if (copies.length === 0) return false;

  const envValue = (process.env.CLIPPINGS_SYNC_COPIES || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(envValue)) return true;
  if (['0', 'false', 'no', 'n'].includes(envValue)) return false;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(`Found ${copies.length} Clippings copy file(s); skipping sync because the build is running non-interactively.`);
    console.log('Set CLIPPINGS_SYNC_COPIES=1 to sync copies automatically.');
    return false;
  }

  const names = copies.map((filePath) => path.basename(filePath)).join(', ');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(`Also sync inline JavaScript into these Clippings copies: ${names}? [y/N] `);
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function writeIfChanged(filePath, nextHtml, originalHtml) {
  if (nextHtml === originalHtml) return false;
  fs.writeFileSync(filePath, nextHtml, 'utf8');
  return true;
}

function mergeUserContentIntoTemplate({ currentHtml, templateHtml }) {
  let mergedHtml = String(templateHtml);
  const fields = [
    ['h1', 'main-title'],
    ['main', 'app-root'],
    ['script', 'highlight-palette-data'],
  ];

  for (const [tagName, tagId] of fields) {
    const currentContent = getTagInner(currentHtml, tagName, tagId);
    if (currentContent !== null) {
      mergedHtml = setTagInner(mergedHtml, tagName, tagId, currentContent);
    }
  }

  const currentTitle = getTitle(currentHtml);
  if (currentTitle !== null) {
    mergedHtml = setTitle(mergedHtml, currentTitle);
  }

  const currentDocId = getMetaContent(currentHtml, 'clippings-doc-id');
  if (currentDocId) {
    mergedHtml = setMetaContent(mergedHtml, 'clippings-doc-id', currentDocId);
  }

  return mergedHtml;
}

async function main() {
  const htmlRaw = fs.readFileSync(htmlPath, 'utf8');
  const jsRaw = fs.readFileSync(jsPath, 'utf8');

  const buildSha = computeBuildId({ html: htmlRaw, js: jsRaw });
  const templateCommit = getGitHeadCommitSha();
  let js = normalizeNewlines(jsRaw);
  if (shouldMinify()) {
    const result = transformSync(js, {
      loader: 'js',
      minify: true,
      target: 'es2020',
    });
    js = result.code;
  }
  js = escapeScriptClose(js);

  const mainBuild = buildHtmlWithInlineJs({
    htmlRaw,
    js,
    buildSha,
    templateCommit,
    filePath: htmlPath,
  });

  writeIfChanged(htmlPath, mainBuild.next, mainBuild.original);

  const htmlCopies = getCandidateHtmlCopies();
  if (!await shouldSyncHtmlCopies(htmlCopies)) return;

  let syncedCount = 0;
  for (const copyPath of htmlCopies) {
    try {
      const copyRaw = fs.readFileSync(copyPath, 'utf8');
      const mergedCopyHtml = mergeUserContentIntoTemplate({
        currentHtml: copyRaw,
        templateHtml: mainBuild.next,
      });
      if (writeIfChanged(copyPath, mergedCopyHtml, normalizeNewlines(copyRaw))) {
        syncedCount += 1;
      }
    } catch (err) {
      console.warn(`Skipping ${path.basename(copyPath)}: ${err.message}`);
    }
  }

  if (syncedCount > 0) {
    console.log(`Synced the latest Clippings template into ${syncedCount} additional Clippings file(s).`);
  }
}

await main();
