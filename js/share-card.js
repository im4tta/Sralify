// --- Generate a shareable "savings card" PNG (pure Canvas, no deps) ---
export function buildShareCard({ fileCount, savedPct, origBytes, compBytes, lang, labels }) {
  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#fff1f2');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Rose accent blob
  ctx.fillStyle = 'rgba(244,63,94,0.10)';
  ctx.beginPath();
  ctx.arc(W - 80, 80, 260, 0, Math.PI * 2);
  ctx.fill();

  // Brand mark
  ctx.fillStyle = '#f43f5e';
  roundRect(ctx, 80, 80, 64, 64, 16);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('S', 80 + 32, 80 + 34);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('Sralify', 164, 112);

  // Headline number
  ctx.fillStyle = '#e11d48';
  ctx.font = 'bold 150px sans-serif';
  const pctLabel = `-${Math.max(0, savedPct).toFixed(0)}%`;
  ctx.fillText(pctLabel, 80, 340);

  ctx.fillStyle = '#334155';
  ctx.font = '600 34px sans-serif';
  ctx.fillText(labels.smaller, 80, 400);

  // Stats row
  ctx.font = '500 26px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`${labels.files}: ${fileCount}`, 80, 470);
  ctx.fillText(`${labels.before}: ${formatBytes(origBytes)}`, 80, 510);
  ctx.fillText(`${labels.after}: ${formatBytes(compBytes)}`, 80, 550);

  ctx.font = '400 24px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(labels.tagline, 80, 600);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(2) + ' MB';
}
