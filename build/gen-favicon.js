/**
 * Generates PNG favicons from scratch using pure Node.js (no native deps).
 * Draws a rose gradient rounded-square with a bold white "S" lettermark.
 * Uses the Jimp-free approach: raw pixel manipulation + manual PNG encoding
 * via a minimal inline zlib/PNG writer.
 *
 * Run: node build/gen-favicon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Minimal PNG encoder ─────────────────────────────────────────────────────
function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crc = crc32(Buffer.concat([t, d]));
  return Buffer.concat([u32be(d.length), t, d, u32be(crc)]);
}

function encodePNG(pixels, w, h) {
  // pixels: Uint8Array of RGBA, row-major
  // Build raw image data with filter byte 0 (None) per row
  const rowLen = w * 4;
  const raw = Buffer.allocUnsafe((rowLen + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (rowLen + 1)] = 0; // filter type None
    for (let x = 0; x < rowLen; x++) {
      raw[y * (rowLen + 1) + 1 + x] = pixels[y * rowLen + x];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const IHDR = Buffer.concat([u32be(w), u32be(h),
    Buffer.from([8, 2, 0, 0, 0])]);   // 8-bit RGB... wait we need RGBA
  // bit depth 8, color type 6 = RGBA
  const ihdr = Buffer.concat([u32be(w), u32be(h),
    Buffer.from([8, 6, 0, 0, 0])]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG sig
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ──────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

// Rose gradient: #f43f5e → #e11d48  (top-left → bottom-right)
function gradientColor(x, y, size) {
  const t = (x + y) / (size * 2);
  return [
    Math.round(lerp(0xf4, 0xe1, t)),
    Math.round(lerp(0x3f, 0x1d, t)),
    Math.round(lerp(0x5e, 0x48, t)),
    255,
  ];
}

function inRoundedRect(x, y, size, radius) {
  const cx = size / 2, cy = size / 2;
  const hw = size / 2 - radius;
  const dx = Math.max(0, Math.abs(x - cx) - hw);
  const dy = Math.max(0, Math.abs(y - cy) - hw);
  return dx * dx + dy * dy <= radius * radius;
}

// ── Rasterise letter S via bezier sampling ──────────────────────────────────
// Rather than embed a font, we draw a convincing "S" using filled rectangles
// at each size (the classic 7-segment / block-letter approach keeps it crisp).
function drawS(pixels, size) {
  const w = size;
  // Proportional measurements
  const pad  = Math.round(size * 0.20);   // outer horizontal padding
  const thick = Math.round(size * 0.155); // stroke thickness
  const r    = Math.round(size * 0.095);  // corner radius of bars
  const mid  = Math.round(size / 2);
  const left  = pad;
  const right = size - pad;
  const barW  = right - left;

  // Top bar, mid bar, bottom bar + two connecting verticals
  const bars = [
    // [x, y, w, h]  — origin = top-left of each bar
    [left,  pad,             barW, thick],                         // top
    [left,  mid - thick / 2, barW, thick],                         // mid
    [left,  size - pad - thick, barW, thick],                      // bottom
    [left,  pad + thick,     thick, mid - thick / 2 - pad - thick],// top-left vert
    [right - thick, mid + thick / 2, thick,
      size - pad - thick - mid - thick / 2],                       // bot-right vert
  ];

  function setPixel(px, py, alpha) {
    const idx = (py * w + px) * 4;
    if (px < 0 || py < 0 || px >= w || py >= w) return;
    const existing = pixels[idx + 3];
    // Composite white over background with given alpha
    const a = Math.max(existing, Math.round(alpha * 255));
    pixels[idx]     = 255;
    pixels[idx + 1] = 255;
    pixels[idx + 2] = 255;
    pixels[idx + 3] = a;
  }

  for (const [bx, by, bw, bh] of bars) {
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        // Anti-alias edges
        const edgeX = Math.min(x - bx, bx + bw - 1 - x, r);
        const edgeY = Math.min(y - by, by + bh - 1 - y, r);
        const fade = Math.min(1, (edgeX + 0.5) / r) * Math.min(1, (edgeY + 0.5) / r);
        setPixel(x, y, fade);
      }
    }
  }
}

// ── Generate one size ────────────────────────────────────────────────────────
function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // RGBA, all transparent

  const radius = Math.round(size * 0.21875); // ~14/64 = 21.875%

  // Draw background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (inRoundedRect(x + 0.5, y + 0.5, size, radius)) {
        const [r, g, b, a] = gradientColor(x, y, size);
        pixels[idx]     = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = a;
      }
    }
  }

  // Draw S lettermark
  drawS(pixels, size);

  return encodePNG(pixels, size, size);
}

// ── Write all sizes ──────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'assets');
const sizes = [16, 32, 192, 512, 180]; // 180 = apple-touch-icon

const nameMap = { 16: 'favicon-16.png', 32: 'favicon-32.png',
  192: 'favicon-192.png', 512: 'favicon-512.png', 180: 'apple-touch-icon.png' };

for (const size of sizes) {
  const png = generateIcon(size);
  const outPath = path.join(outDir, nameMap[size]);
  fs.writeFileSync(outPath, png);
  console.log(`✓ ${nameMap[size]}  (${size}×${size})  ${(png.length / 1024).toFixed(1)} KB`);
}

console.log('\nDone. All favicons regenerated.');
