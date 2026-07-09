// --- Generate a shareable "savings card" PNG (pure Canvas, no deps) ---
export function buildShareCard({ fileCount, savedPct, origBytes, compBytes, lang, labels }) {
  const W = 640, H = 360;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background - dark gradient matching favicon
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1e2a4a');
  grad.addColorStop(1, '#111827');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative circle (subtle)
  ctx.strokeStyle = 'rgba(243, 211, 138, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 120, 0, Math.PI * 2);
  ctx.stroke();

  // Icon (rounded square with S - matching favicon style)
  const iconSize = 48;
  const iconX = 32, iconY = 28;
  ctx.fillStyle = '#f43f5e';
  roundRect(ctx, iconX, iconY, iconSize, iconSize, 10);
  ctx.fill();
  
  // Draw feather + S simplified mark
  ctx.fillStyle = 'rgba(243, 211, 138, 1)';
  ctx.font = 'bold 26px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('S', iconX + iconSize / 2, iconY + iconSize / 2 + 1);

  // Brand name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f3d38a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Sralify', iconX + iconSize + 12, iconY + iconSize / 2 + 1);

  // Headline - percentage saved
  ctx.fillStyle = '#f3d38a';
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  const pctLabel = `-${Math.max(0, savedPct).toFixed(0)}%`;
  ctx.fillText(pctLabel, W / 2, H / 2 + 30);

  // "smaller" label
  ctx.fillStyle = 'rgba(243, 211, 138, 0.7)';
  ctx.font = '500 20px sans-serif';
  ctx.fillText(labels.smaller, W / 2, H / 2 + 65);

  // Stats row
  ctx.textAlign = 'left';
  ctx.font = '500 16px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  const statsY = H - 50;
  ctx.fillText(`${labels.files}: ${fileCount}`, 40, statsY);
  ctx.fillText(`${labels.before}: ${formatBytes(origBytes)}`, 200, statsY);
  ctx.fillText(`${labels.after}: ${formatBytes(compBytes)}`, 380, statsY);

  // Tagline
  ctx.font = '400 13px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('sralify.vercel.app', 40, H - 22);

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
