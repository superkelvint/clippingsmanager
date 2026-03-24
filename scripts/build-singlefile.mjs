import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), '..');
const htmlPath = path.join(rootDir, 'clippings.html');
const jsPath = path.join(rootDir, 'src', 'clippings.js');

const beginMarker = '/* BEGIN_INLINE:src/clippings.js */';
const endMarker = '/* END_INLINE */';
const buildShaPlaceholder = '__CLIPPINGS_BUILD_SHA__';
const buildShaMetaRe = /(<meta\s+name=["']clippings-build-sha["']\s+content=["'])([^"']*)(["']\s*\/?>)/i;

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

function escapeScriptClose(js) {
  // Avoid accidentally terminating the script tag if user content ever includes </script>.
  return js.replace(/<\/script>/gi, '<\\/script>');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function computeBuildId({ html, js }) {
  // Build id should reflect template source (HTML skeleton + src JS), not the git commit SHA.
  // This stays stable across commits/builds unless the actual template/JS changes.
  const beginIdx = html.indexOf(beginMarker);
  const endIdx = beginIdx === -1 ? -1 : html.indexOf(endMarker, beginIdx + beginMarker.length);
  const skeleton =
    beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx
      ? html
      : html.slice(0, beginIdx) + beginMarker + html.slice(endIdx);

  return sha256Hex(normalizeNewlines(skeleton) + '\n' + normalizeNewlines(js));
}

function main() {
  const htmlRaw = fs.readFileSync(htmlPath, 'utf8');
  const jsRaw = fs.readFileSync(jsPath, 'utf8');

  const buildSha = computeBuildId({ html: htmlRaw, js: jsRaw });
  const htmlOriginal = normalizeNewlines(htmlRaw);
  let html = htmlOriginal;
  // Keep supporting the placeholder (first-time insertion), but also continuously update the meta tag
  // on subsequent builds after the placeholder has been replaced.
  html = html.replaceAll(buildShaPlaceholder, buildSha);
  if (buildShaMetaRe.test(html)) {
    html = html.replace(buildShaMetaRe, `$1${buildSha}$3`);
  }
  const js = escapeScriptClose(normalizeNewlines(jsRaw));

  const beginIdx = html.indexOf(beginMarker);
  const endIdx = beginIdx === -1 ? -1 : html.indexOf(endMarker, beginIdx + beginMarker.length);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
    throw new Error(`Could not find inline markers in ${htmlPath}`);
  }

  const insertStart = beginIdx + beginMarker.length;
  const nextHtml =
    html.slice(0, insertStart) +
    // Preserve leading newline in src if present; don't force one here.
    js +
    html.slice(endIdx);

  if (nextHtml === htmlOriginal) return;
  fs.writeFileSync(htmlPath, nextHtml, 'utf8');
}

main();
