// --- Lazy-loading of heavy, format-specific libraries ---
// Nothing here loads until a file of that type is actually queued.
// This keeps the initial page weight tiny (a few KB of our own JS)
// no matter how many formats Sralify supports.

const pending = {};

function loadScript(src) {
  if (pending[src]) return pending[src];
  pending[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
  return pending[src];
}

let pdfLibsReady = null;
export function ensurePdfLibs() {
  if (!pdfLibsReady) {
    pdfLibsReady = Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    ]).then(() => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    });
  }
  return pdfLibsReady;
}

let zipLibReady = null;
export function ensureZipLib() {
  if (!zipLibReady) {
    zipLibReady = loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }
  return zipLibReady;
}
