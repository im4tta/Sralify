// --- Compress an image using the native Canvas API ---
// No library needed: createImageBitmap + canvas.toBlob ship in every
// modern browser, so adding images costs zero extra bytes over the wire.

async function getBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch (e) {
      // fall through to <img> fallback (e.g. some HEIC/edge cases)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pickOutput(file, format) {
  if (format === 'jpeg') return { mime: 'image/jpeg', ext: 'jpg' };
  if (format === 'webp') return { mime: 'image/webp', ext: 'webp' };
  if (format === 'png') return { mime: 'image/png', ext: 'png' };
  // "auto" — keep the original type when it's one we can re-encode,
  // otherwise fall back to JPEG.
  if (/^image\/(jpeg|png|webp)$/.test(file.type)) {
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    return { mime: file.type, ext };
  }
  return { mime: 'image/jpeg', ext: 'jpg' };
}

export async function compressImage(file, settings) {
  const source = await getBitmap(file);
  let width = source.width;
  let height = source.height;

  if (settings.maxDimension && Math.max(width, height) > settings.maxDimension) {
    const ratio = settings.maxDimension / Math.max(width, height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const { mime, ext } = pickOutput(file, settings.format);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (mime === 'image/jpeg') {
    // JPEG has no alpha channel — flatten onto white first.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);
  source.close?.();

  const quality = mime === 'image/png' ? undefined : settings.quality;
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), mime, quality);
  });

  canvas.width = 0;
  canvas.height = 0;
  return { blob, ext };
}
