import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function resolveBinary({ envVar, absoluteCandidates, commandCandidates }) {
  const envValue = process.env[envVar];
  if (envValue) {
    if (envValue.includes('/')) {
      if (existsSync(envValue)) return envValue;
    } else {
      const check = spawnSync('which', [envValue], { encoding: 'utf8' });
      if (check.status === 0) return envValue;
    }
  }
  for (const absolutePath of absoluteCandidates) {
    if (existsSync(absolutePath)) return absolutePath;
  }
  for (const commandName of commandCandidates) {
    const check = spawnSync('which', [commandName], { encoding: 'utf8' });
    if (check.status === 0) return commandName;
  }
  return '';
}

const chromePath = resolveBinary({
  envVar: 'CLIPPINGS_DEMO_CHROME',
  absoluteCandidates: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ],
  commandCandidates: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'],
});
const ffmpegPath = resolveBinary({
  envVar: 'CLIPPINGS_DEMO_FFMPEG',
  absoluteCandidates: ['/usr/bin/ffmpeg'],
  commandCandidates: ['ffmpeg'],
});
const workdir = process.cwd();
const htmlPath = resolve(workdir, 'clippings.html');
const outputPath = resolve(workdir, 'clippings-demo.mp4');
const framesDir = resolve(workdir, '.demo-frames');
const chromeProfile = join(tmpdir(), `clippings-chrome-profile-${Date.now()}`);
const remotePort = 9222;
const width = 1400;
const height = 1100;
const fps = 12;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForJson(url, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.openPromise = new Promise((resolvePromise, rejectPromise) => {
      this.ws.addEventListener('open', resolvePromise, { once: true });
      this.ws.addEventListener('error', rejectPromise, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id) {
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error.message));
        else pending.resolve(msg.result);
        return;
      }
      const handlers = this.events.get(msg.method) || [];
      for (const handler of handlers) handler(msg.params || {});
    });
  }

  async ready() {
    await this.openPromise;
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = { id, method, params };
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
    });
  }

  on(method, handler) {
    const current = this.events.get(method) || [];
    current.push(handler);
    this.events.set(method, current);
  }

  close() {
    this.ws.close();
  }
}

async function evalJs(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.text || 'Runtime evaluation failed';
    const description = result.exceptionDetails.exception?.description || '';
    const line = result.exceptionDetails.lineNumber;
    const column = result.exceptionDetails.columnNumber;
    throw new Error(`${text}${description ? `: ${description}` : ''}${typeof line === 'number' ? ` @${line}:${column}` : ''}`);
  }
  return result;
}

function demoShimSource() {
  return `
    (() => {
      let storedHtml = '';
      const fakeHandle = {
        async queryPermission() { return 'granted'; },
        async getFile() {
          const html = storedHtml || '<!DOCTYPE html>' + document.documentElement.outerHTML;
          return new File([html], 'clippings.html', { type: 'text/html' });
        },
        async createWritable() {
          return {
            async write(content) { storedHtml = String(content); },
            async close() {}
          };
        }
      };
      Object.defineProperty(window, 'showOpenFilePicker', {
        configurable: true,
        writable: true,
        value: async () => [fakeHandle]
      });
      window.confirm = () => true;
    })();
  `;
}

function interactionScript() {
  return `
    (async () => {
      const pace = 1.55;
      const wait = (ms) => new Promise((r) => setTimeout(r, Math.round(ms * pace)));
      const click = (selector) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Missing element: ' + selector);
        el.click();
        return el;
      };
      const waitFor = async (selector, timeout = 2000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const el = document.querySelector(selector);
          if (el) return el;
          await wait(50);
        }
        throw new Error('Missing element after wait: ' + selector);
      };
      const setEditable = (selector, value) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Missing editable: ' + selector);
        el.focus();
        el.innerText = value;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
        return el;
      };
      const setHtml = (selector, html) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Missing editable: ' + selector);
        el.focus();
        el.innerHTML = html;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: null, inputType: 'insertFromPaste' }));
        return el;
      };
      const setInputValue = (selector, value) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Missing input: ' + selector);
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return el;
      };
      const clickWithMods = (selector, { ctrlKey = false, metaKey = false, shiftKey = false } = {}) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Missing element for modified click: ' + selector);
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey, metaKey, shiftKey }));
        return el;
      };
      const pressKey = (selector, key) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Missing input for key press: ' + selector);
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
      };
      const ensureCaption = () => {
        let el = document.getElementById('demo-caption');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'demo-caption';
        el.style.position = 'fixed';
        el.style.left = '50%';
        el.style.bottom = '28px';
        el.style.transform = 'translateX(-50%)';
        el.style.padding = '14px 20px';
        el.style.borderRadius = '999px';
        el.style.background = 'rgba(17, 24, 39, 0.88)';
        el.style.color = '#fff';
        el.style.font = '700 22px system-ui, sans-serif';
        el.style.letterSpacing = '0.01em';
        el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
        el.style.zIndex = '2000';
        el.style.pointerEvents = 'none';
        el.style.opacity = '0';
        el.style.transition = 'opacity 180ms ease';
        document.body.appendChild(el);
        return el;
      };
      const showCaption = async (text, ms = 1700) => {
        const el = ensureCaption();
        el.textContent = text;
        el.style.opacity = '1';
        await wait(ms);
      };
      const hideCaption = async (ms = 150) => {
        const el = ensureCaption();
        el.style.opacity = '0';
        await wait(ms);
      };
      const textNodes = (root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let current;
        while ((current = walker.nextNode())) nodes.push(current);
        return nodes;
      };
      const formatPhrase = (selector, phrase, command) => {
        const root = document.querySelector(selector);
        if (!root) throw new Error('Missing root: ' + selector);
        const nodes = textNodes(root);
        for (const node of nodes) {
          const idx = node.textContent.indexOf(phrase);
          if (idx >= 0) {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + phrase.length);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            root.focus();
            document.execCommand(command, false, null);
            root.dispatchEvent(new InputEvent('input', { bubbles: true, data: null, inputType: 'format' + command }));
            return;
          }
        }
        throw new Error('Missing phrase: ' + phrase);
      };
      const moveBefore = (sourceSelector, targetSelector) => {
        const source = document.querySelector(sourceSelector);
        const target = document.querySelector(targetSelector);
        if (!source || !target) throw new Error('Missing reorder nodes');
        source.classList.add('dragging');
        target.classList.add('drag-over-top');
        target.parentNode.insertBefore(source, target);
        document.querySelectorAll('.dragging, .drag-over-top').forEach((el) => {
          el.classList.remove('dragging', 'drag-over-top');
        });
        if (typeof triggerUpdate === 'function') triggerUpdate();
      };

      await wait(500);
      click('#help-btn');
      await showCaption('Help explains the editing workflow', 800);
      await wait(900);
      click('#close-help-btn');
      await hideCaption();
      await wait(300);

      click('#enable-edit-btn');
      await showCaption('Enable editing to start changing the file', 700);
      await wait(700);
      await hideCaption();

      setEditable('#main-title', 'Maya Birthday Plan');
      await showCaption('The title is editable', 650);
      await wait(700);
      await hideCaption();

      click('.add-section');
      await showCaption('Add sections for big topics', 500);
      await wait(500);
      setEditable('.section:last-of-type .section-title', 'Guest List');
      await wait(500);
      click('.section:last-of-type > .add-entry');
      await showCaption('Add entries inside a section', 500);
      await wait(500);
      setEditable('.section:last-of-type .entry:last-of-type .source', 'Text Thread');
      await wait(400);
      setHtml('.section:last-of-type .entry:last-of-type .text', 'Invite close friends first.<br>Check who is free on Saturday afternoon.');
      await wait(700);
      await showCaption('Bold and italic work inside note text', 650);
      formatPhrase('.section:last-of-type .entry:last-of-type .text', 'close friends', 'bold');
      await wait(900);
      click('.section:last-of-type > .add-entry');
      await wait(500);
      setEditable('.section:last-of-type .entry:last-of-type .source', 'School Friends');
      await wait(400);
      setHtml('.section:last-of-type .entry:last-of-type .text', 'If the space is small, keep this list short.<br><strong>Cap the total at 12</strong> so it stays easy.');
      await wait(700);
      formatPhrase('.section:last-of-type .entry:last-of-type .text', 'stays easy', 'italic');
      await wait(1000);
      await hideCaption();

      await showCaption('Tags are now built in per entry', 800);
      click('.section:first-of-type .entry:first-of-type .entry-tag-edit-toggle');
      await wait(300);
      setInputValue('.section:first-of-type .entry:first-of-type .entry-tag-input', 'AI');
      await wait(200);
      click('.section:first-of-type .entry:first-of-type .entry-tag-add');
      await wait(400);
      click('.section:first-of-type .entry:first-of-type .entry-tag-done');
      await wait(600);

      await showCaption('Autocomplete reuses known tags to keep naming consistent', 1100);
      click('.section:first-of-type .entry:nth-of-type(2) .entry-tag-edit-toggle');
      await wait(300);
      setInputValue('.section:first-of-type .entry:nth-of-type(2) .entry-tag-input', 'ai');
      await wait(200);
      pressKey('.section:first-of-type .entry:nth-of-type(2) .entry-tag-input', 'Enter');
      await wait(350);
      setInputValue('.section:first-of-type .entry:nth-of-type(2) .entry-tag-input', 'Logistics');
      await wait(200);
      click('.section:first-of-type .entry:nth-of-type(2) .entry-tag-add');
      await wait(350);
      click('.section:first-of-type .entry:nth-of-type(2) .entry-tag-done');
      await wait(900);
      await hideCaption();

      await showCaption('Search supports tag queries like tag:AI', 950);
      setInputValue('#entry-search', 'tag:AI');
      await wait(1400);
      pressKey('#entry-search', 'Escape');
      await wait(700);
      await hideCaption();

      await showCaption('Tag chips above search can filter by ANY or ALL matches', 1200);
      click('[data-testid="search-tag-filter"]:nth-of-type(1)');
      await wait(1100);
      clickWithMods('[data-testid="search-tag-filter"]:nth-of-type(2)', { shiftKey: true });
      await wait(1500);
      pressKey('#entry-search', 'Escape');
      await wait(800);
      await hideCaption();

      click('.add-section');
      await wait(500);
      setEditable('.section:last-of-type .section-title', 'Food');
      await wait(500);
      click('.section:last-of-type > .add-entry');
      await wait(500);
      setEditable('.section:last-of-type .entry:last-of-type .source', 'Menu Ideas');
      await wait(400);
      setHtml('.section:last-of-type .entry:last-of-type .text', 'Pizza is the easy default.<br>Get one veggie option and extra sparkling water.');
      await wait(900);
      click('.section:last-of-type > .add-entry');
      await wait(500);
      setEditable('.section:last-of-type .entry:last-of-type .source', 'Bakery Notes');
      await wait(400);
      setHtml('.section:last-of-type .entry:last-of-type .text', 'Chocolate with strawberries.<br><em>No nuts, just in case.</em>');
      await wait(800);
      await showCaption('Entries can be reordered within a section', 850);
      moveBefore('.section:nth-of-type(2) .entry:last-of-type', '.section:nth-of-type(2) .entry:first-of-type');
      await wait(1000);
      await hideCaption();

      click('.add-section');
      await wait(500);
      setEditable('.section:last-of-type .section-title', 'Activities');
      await wait(500);
      click('.section:last-of-type > .add-entry');
      await wait(500);
      setEditable('.section:last-of-type .entry:last-of-type .source', 'Backyard');
      await wait(400);
      setHtml('.section:last-of-type .entry:last-of-type .text', 'Set up string lights.<br>Keep one table open for gifts and snacks.');
      await wait(900);
      click('.section:last-of-type > .add-entry');
      await wait(500);
      setEditable('.section:last-of-type .entry:last-of-type .source', 'Games');
      await wait(400);
      setHtml('.section:last-of-type .entry:last-of-type .text', 'Trivia round, then music.<br>Make a short playlist before Friday night.');
      await wait(1000);

      click('#toc-level-btn');
      await showCaption('The table of contents updates as you edit', 800);
      await wait(900);

      document.querySelector('#toc-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
      await wait(1200);
      document.querySelectorAll('.section')[1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(1200);
      document.querySelector('.section:last-of-type').scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(1300);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await wait(1400);
      await hideCaption();

      click('#enable-edit-btn');
      await showCaption('Exit editing to lock the document again', 850);
      await wait(1000);
      await hideCaption();

      return 'done';
    })();
  `;
}

async function main() {
  if (!chromePath) {
    throw new Error('Could not find Chrome/Chromium binary. Set CLIPPINGS_DEMO_CHROME to a valid executable path.');
  }
  if (!ffmpegPath) {
    throw new Error('Could not find ffmpeg binary. Set CLIPPINGS_DEMO_FFMPEG to a valid executable path.');
  }

  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  const chromeArgs = [
    `--remote-debugging-port=${remotePort}`,
    '--remote-debugging-address=127.0.0.1',
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
    `--window-size=${width},${height}`,
    `--user-data-dir=${chromeProfile}`,
    `file://${htmlPath}`,
  ];

  const chrome = spawn(chromePath, chromeArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let chromeLogs = '';
  chrome.stdout.on('data', (chunk) => {
    chromeLogs += String(chunk);
  });
  chrome.stderr.on('data', (chunk) => {
    chromeLogs += String(chunk);
  });

  try {
    const targets = await waitForJson(`http://127.0.0.1:${remotePort}/json/list`);
    const page = targets.find((target) => target.type === 'page');
    if (!page?.webSocketDebuggerUrl) {
      throw new Error('Could not find Chrome page target');
    }

    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.ready();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: demoShimSource() });

    await client.send('Page.navigate', { url: `file://${htmlPath}` });
    await new Promise((resolvePromise) => {
      client.on('Page.loadEventFired', resolvePromise);
    });
    await sleep(800);

    let frameIndex = 0;
    client.on('Page.screencastFrame', async (params) => {
      const filename = join(framesDir, `${String(frameIndex).padStart(5, '0')}.jpg`);
      writeFileSync(filename, Buffer.from(params.data, 'base64'));
      frameIndex += 1;
      await client.send('Page.screencastFrameAck', { sessionId: params.sessionId });
    });

    await client.send('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 255, g: 255, b: 255, a: 1 },
    });
    await client.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      everyNthFrame: 1,
    });

    await evalJs(client, interactionScript());
    await sleep(1000);
    await client.send('Page.stopScreencast');
    await sleep(300);
    client.close();

    if (frameIndex === 0) {
      throw new Error('No frames captured');
    }

    const ffmpegArgs = [
      '-y',
      '-framerate', String(fps),
      '-i', join(framesDir, '%05d.jpg'),
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
      '-movflags', '+faststart',
      outputPath,
    ];

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: workdir,
    });

    let ffmpegLogs = '';
    ffmpeg.stdout.on('data', (chunk) => { ffmpegLogs += String(chunk); });
    ffmpeg.stderr.on('data', (chunk) => { ffmpegLogs += String(chunk); });

    const ffmpegCode = await new Promise((resolvePromise) => {
      ffmpeg.on('close', resolvePromise);
    });
    if (ffmpegCode !== 0) {
      throw new Error(`ffmpeg failed\n${ffmpegLogs}`);
    }

    console.log(`Saved ${outputPath}`);
  } catch (error) {
    console.error(String(error.stack || error));
    if (chromeLogs) console.error(chromeLogs);
    process.exitCode = 1;
  } finally {
    chrome.kill('SIGKILL');
    await new Promise((resolvePromise) => {
      chrome.once('close', resolvePromise);
      setTimeout(resolvePromise, 1000);
    });
    rmSync(chromeProfile, { recursive: true, force: true });
  }
}

await main();
