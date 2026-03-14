import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), '..');
const htmlPath = path.join(rootDir, 'clippings.html');
const jsPath = path.join(rootDir, 'src', 'clippings.js');

const beginMarker = '/* BEGIN_INLINE:src/clippings.js */';
const endMarker = '/* END_INLINE */';

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

function escapeScriptClose(js) {
  // Avoid accidentally terminating the script tag if user content ever includes </script>.
  return js.replace(/<\/script>/gi, '<\\/script>');
}

function main() {
  const htmlRaw = fs.readFileSync(htmlPath, 'utf8');
  const jsRaw = fs.readFileSync(jsPath, 'utf8');

  const html = normalizeNewlines(htmlRaw);
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

  if (nextHtml === html) return;
  fs.writeFileSync(htmlPath, nextHtml, 'utf8');
}

main();
