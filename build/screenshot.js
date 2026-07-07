/**
 * Sralify — Screenshot generator
 *
 * Renders the live app in a headless browser (light + dark) and writes
 * assets/screenshot.png and assets/screenshot-dark.png, so the README
 * previews stay in sync with the UI without manual screen-grabs.
 *
 * Run: node build/screenshot.js
 */
'use strict';
const fs   = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT    = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets');
const PORT    = 4891;

// Prefer a system-installed browser on Windows/macOS to avoid the flaky
// bundled-Chromium launch. Falls back to Puppeteer's default if none found.
function findSystemBrowser() {
  const fsSync = require('fs');
  const os = require('os');
  const candidates = [];
  if (os.platform() === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    );
  }
  for (const p of candidates) {
    if (fsSync.existsSync(p)) return p;
  }
  return undefined;
}

// --- tiny static file server (no extra deps) ---
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp',
};

function startServer() {
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  }).listen(PORT);
}

function pad(n) { return String(n).padStart(2, '0'); }
function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function shoot(browser, { scheme, outPath }) {
  const page = await browser.newPage();
  // Render above the 640px breakpoint so the 3-column preset grid shows;
  // deviceScaleFactor 2 keeps the PNG crisp for retina displays.
  await page.setViewport({ width: 820, height: 1100, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: scheme },
  ]);

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

  // Force the requested scheme regardless of any saved localStorage override,
  // dismiss the PWA install banner, and let the entrance animations settle.
  await page.evaluate((s) => {
    try {
      localStorage.removeItem('sralify-theme');
      localStorage.setItem('sralify-install-dismissed', '1');
    } catch {}
    document.documentElement.classList.toggle('dark', s === 'dark');
  }, scheme);

  // Wait for fonts + gradient animations to settle before capture.
  await page.waitForFunction(() => document.fonts && document.fonts.status === 'loaded')
    .catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({
    path: outPath,
    fullPage: true,
    type: 'png',
  });

  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`✓  ${path.relative(ROOT, outPath).padEnd(28)} ${scheme.padEnd(5)}  ${kb} KB`);
  await page.close();
}

async function main() {
  const server = startServer();
  const executablePath = findSystemBrowser();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    await shoot(browser, { scheme: 'light', outPath: path.join(OUT_DIR, 'screenshot.png') });
    await shoot(browser, { scheme: 'dark',  outPath: path.join(OUT_DIR, 'screenshot-dark.png') });
    console.log(`\nScreenshots regenerated (${timestamp()})`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
