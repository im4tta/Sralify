/**
 * Sralify — Favicon generator
 * Uses `sharp` to render assets/favicon.svg into crisp PNGs at all required sizes.
 *
 * Run: node build/gen-favicon.js
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgPath = path.join(__dirname, '..', 'assets', 'favicon.svg');
const outDir  = path.join(__dirname, '..', 'assets');

const sizes = [
  { size: 16,  name: 'favicon-16.png' },
  { size: 32,  name: 'favicon-32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'favicon-192.png' },
  { size: 512, name: 'favicon-512.png' },
];

async function generate() {
  const svgBuf = fs.readFileSync(svgPath);

  for (const { size, name } of sizes) {
    const dest = path.join(outDir, name);
    await sharp(svgBuf)
      .resize(size, size)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(dest);

    const kb = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log(`✓  ${name.padEnd(22)} ${size}×${size}  ${kb} KB`);
  }
  console.log('\nAll favicons regenerated from favicon.svg');
}

generate().catch(err => { console.error(err); process.exit(1); });
