import { ensurePdfLibs } from './lazy-loader.js';

// --- Compress a PDF by re-rasterizing each page to JPEG ---
export async function compressPdf(file, settings, onPageProgress) {
  await ensurePdfLibs();
  const { jsPDF } = window.jspdf;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let outDoc = null;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: settings.scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = canvas.toDataURL('image/jpeg', settings.quality);

    const ptViewport = page.getViewport({ scale: 1 });
    const pageW = ptViewport.width;
    const pageH = ptViewport.height;
    const orientation = pageW > pageH ? 'l' : 'p';

    if (i === 1) {
      outDoc = new jsPDF({
        orientation,
        unit: 'pt',
        format: [pageW, pageH],
        compress: true,
      });
    } else {
      outDoc.addPage([pageW, pageH], orientation);
    }
    outDoc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');

    canvas.width = 0;
    canvas.height = 0;
    if (onPageProgress) onPageProgress(i, numPages);
    await new Promise(r => setTimeout(r, 0));
  }

  const blob = outDoc.output('blob');
  return { blob, ext: 'pdf' };
}
