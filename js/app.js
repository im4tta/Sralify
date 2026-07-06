import { initI18n, t, setLang, currentLang } from './i18n.js';
import { compressPdf } from './pdf-compressor.js';
import { compressImage } from './image-compressor.js';
import { buildShareCard } from './share-card.js';
import { ensureZipLib } from './lazy-loader.js';

const PDF_TYPE = 'application/pdf';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// --- State ---
const items = [];
let nextId = 1;
let isProcessing = false;
let hasUnsavedWork = false;
let installPromptEvent = null;
let cancelRequested = false;

// --- Element refs ---
const dropzone       = document.getElementById('dropzone');
const fileInput      = document.getElementById('file-input');
const compressBtn    = document.getElementById('compress-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const shareBtn       = document.getElementById('share-btn');
const clearBtn       = document.getElementById('clear-btn');
const queueSection   = document.getElementById('queue-section');
const fileListEl     = document.getElementById('file-list');
const fileCountEl    = document.getElementById('file-count');
const errorEl        = document.getElementById('error');
const errorMsg       = document.getElementById('error-msg');
const summaryEl      = document.getElementById('summary');
const totalOrig      = document.getElementById('total-original');
const totalComp      = document.getElementById('total-compressed');
const totalSaved     = document.getElementById('total-saved');
const levelOptions   = document.getElementById('level-options');
const scaleSlider    = document.getElementById('scale-slider');
const qualitySlider  = document.getElementById('quality-slider');
const scaleValue     = document.getElementById('scale-value');
const qualityValue   = document.getElementById('quality-value');
const pdfSettings    = document.getElementById('pdf-only-settings');
const imageSettings  = document.getElementById('image-only-settings');
const formatSelect   = document.getElementById('format-select');
const resizeSelect   = document.getElementById('resize-select');
const dragOverlay    = document.getElementById('drag-overlay');

const ICONS = {
  pdf:   `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`,
  image: `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>`,
  done:  `<polyline points="20 6 9 17 4 12"/>`,
  error: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
};

// =====================
// SETTINGS
// =====================
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('sralify-settings') || '{}');
    if (s.scale)    scaleSlider.value   = s.scale;
    if (s.quality)  qualitySlider.value = s.quality;
    if (s.format)   formatSelect.value  = s.format;
    if (s.maxDimension !== undefined) resizeSelect.value = s.maxDimension || '0';
  } catch {}
  updateSliderLabels();
}

function persistSettings() {
  try {
    localStorage.setItem('sralify-settings', JSON.stringify(getSettings()));
  } catch {}
}

function getSettings() {
  return {
    scale:        parseFloat(scaleSlider.value),
    quality:      parseFloat(qualitySlider.value),
    format:       formatSelect.value,
    maxDimension: resizeSelect.value === '0' ? null : parseInt(resizeSelect.value, 10),
  };
}

function updateSliderLabels() {
  scaleValue.textContent  = scaleSlider.value;
  qualityValue.textContent = Number(qualitySlider.value).toFixed(2);
}

function updateSettingsVisibility() {
  const hasPdf   = items.some(i => i.type === 'pdf');
  const hasImage = items.some(i => i.type === 'image');
  pdfSettings.classList.toggle('hidden',   !hasPdf   && items.length > 0);
  imageSettings.classList.toggle('hidden', !hasImage && items.length > 0);
  if (items.length === 0) {
    pdfSettings.classList.remove('hidden');
    imageSettings.classList.remove('hidden');
  }
}

levelOptions.addEventListener('click', e => {
  const card = e.target.closest('.preset-card');
  if (!card) return;
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  scaleSlider.value   = card.dataset.scale;
  qualitySlider.value = card.dataset.quality;
  updateSliderLabels();
  persistSettings();
});
scaleSlider.addEventListener('input', () => {
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
  updateSliderLabels();
});
scaleSlider.addEventListener('change', persistSettings);
qualitySlider.addEventListener('input', () => {
  document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
  updateSliderLabels();
});
qualitySlider.addEventListener('change', persistSettings);
formatSelect.addEventListener('change', persistSettings);
resizeSelect.addEventListener('change', persistSettings);

// =====================
// UTILITIES
// =====================
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(2) + ' MB';
}

function showError(msg) { errorMsg.textContent = msg; errorEl.classList.remove('hidden'); }
function clearError()   { errorEl.classList.add('hidden'); }

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3000);
}

function detectType(file) {
  if (file.type === PDF_TYPE || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)) return 'image';
  return null;
}

function baseName(f) { return f.replace(/\.[^.]+$/, ''); }

function updateUnsavedWork() {
  hasUnsavedWork = items.some(i => i.status === 'done' && !i.downloaded);
}

// =====================
// SMART SUGGESTION
// Analyze image pixels to suggest the best preset
// =====================
async function analyzeImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Sample at max 80x80 for speed
      const s = Math.min(1, 80 / Math.max(img.width, img.height));
      canvas.width  = Math.round(img.width  * s);
      canvas.height = Math.round(img.height * s);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, edgeScore = 0;
      const px = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i+1]; b += data[i+2];
      }
      const ar = r/px, ag = g/px, ab = b/px;
      const brightness = (ar + ag + ab) / 3 / 255;
      // Colorfulness: max deviation from mean
      const colorfulness = (Math.max(ar, ag, ab) - Math.min(ar, ag, ab)) / 255;
      // Simple edge: compare neighbouring pixels
      for (let y = 0; y < canvas.height - 1; y++) {
        for (let x = 0; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;
          const dR = Math.abs(data[idx] - data[idx + 4]) + Math.abs(data[idx] - data[idx + canvas.width * 4]);
          if (dR > 30) edgeScore++;
        }
      }
      const edgeDensity = edgeScore / px;
      canvas.width = canvas.height = 0;
      resolve({ brightness, colorfulness, edgeDensity });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function getSuggestion({ brightness, colorfulness, edgeDensity }) {
  // High edge density + low colorfulness → document/text → use Low (high quality)
  if (edgeDensity > 0.12 && colorfulness < 0.15) {
    return { preset: 'low', scale: '2.0', quality: '0.85', reason: 'suggest-document' };
  }
  // High colorfulness + high brightness → vibrant photo → can use Extreme
  if (colorfulness > 0.35 && brightness > 0.45) {
    return { preset: 'extreme', scale: '1.1', quality: '0.55', reason: 'suggest-photo' };
  }
  return null; // Recommended is fine, no need to suggest
}

async function attachSuggestion(item) {
  if (item.type !== 'image') return;
  const analysis = await analyzeImage(item.file);
  if (!analysis) return;
  const suggestion = getSuggestion(analysis);
  if (!suggestion) return;

  // Render a chip below the file name
  const chip = document.createElement('button');
  chip.className = 'suggestion-chip';
  chip.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
         style="width:0.75rem;height:0.75rem">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
    <span>${t(suggestion.reason)}</span>
  `;
  chip.title = t('suggest-apply');
  chip.addEventListener('click', () => {
    // Apply suggested preset
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
    const targetCard = [...document.querySelectorAll('.preset-card')]
      .find(c => c.dataset.quality === suggestion.quality);
    if (targetCard) targetCard.classList.add('selected');
    scaleSlider.value   = suggestion.scale;
    qualitySlider.value = suggestion.quality;
    updateSliderLabels();
    persistSettings();
    chip.remove();
    showToast(t('suggest-applied'), 'success');
  });
  item.metaEl.after(chip);
}

// =====================
// FILE ROW RENDERING
// =====================
function createFileRow(item) {
  const row = document.createElement('div');
  row.className = 'file-row';
  row.dataset.id = item.id;
  row.setAttribute('role', 'listitem');
  row.innerHTML = `
    <div class="file-icon file-icon-${item.type}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" class="icon-type"><title>${item.type}</title>${ICONS[item.type]}</svg>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" class="icon-done hidden">${ICONS.done}</svg>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" class="icon-error hidden">${ICONS.error}</svg>
    </div>
    <div class="file-info">
      <div class="file-name"></div>
      <div class="file-meta"></div>
      <div class="file-progress hidden"><div class="file-progress-bar"></div></div>
    </div>
    <div class="file-actions">
      <span class="btn-download hidden">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
             style="width:0.875rem;height:0.875rem">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span class="dl-label">${t('download')}</span>
      </span>
      <button class="btn-icon btn-preview hidden" title="${t('preview')}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="width:1rem;height:1rem">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button class="btn-icon btn-recompress hidden" title="${t('recompress')}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="width:1rem;height:1rem">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
        </svg>
      </button>
      <button class="btn-icon btn-remove" title="${t('remove')}" aria-label="${t('remove')}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="width:1rem;height:1rem">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;

  item.rowEl       = row;
  item.barEl       = row.querySelector('.file-progress-bar');
  item.progressEl  = row.querySelector('.file-progress');
  item.nameEl      = row.querySelector('.file-name');
  item.metaEl      = row.querySelector('.file-meta');
  item.dlEl        = row.querySelector('.btn-download');
  item.removeEl    = row.querySelector('.btn-remove');
  item.recompressEl = row.querySelector('.btn-recompress');
  item.previewEl   = row.querySelector('.btn-preview');
  item.iconTypeEl  = row.querySelector('.icon-type');
  item.iconDoneEl  = row.querySelector('.icon-done');
  item.iconErrorEl = row.querySelector('.icon-error');

  item.nameEl.textContent = item.file.name;
  item.metaEl.textContent = formatBytes(item.file.size);

  item.removeEl.addEventListener('click',    () => removeItem(item.id));
  item.recompressEl.addEventListener('click', () => resetItem(item.id));
  item.previewEl.addEventListener('click',   () => openPreview(item));

  return row;
}

function setStatusIcon(item, status) {
  const ic = item.rowEl.querySelector('.file-icon');
  item.iconTypeEl.classList.toggle('hidden',  status !== 'queued' && status !== 'processing');
  item.iconDoneEl.classList.toggle('hidden',  status !== 'done');
  item.iconErrorEl.classList.toggle('hidden', status !== 'error');
  ic.classList.remove('status-done', 'status-error');
  if (status === 'done')  ic.classList.add('status-done');
  if (status === 'error') ic.classList.add('status-error');
}

function resetItem(id) {
  const item = items.find(i => i.id === id);
  if (!item || isProcessing) return;
  if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
  Object.assign(item, { status: 'queued', compressedBlob: null, compressedSize: 0,
    compressedName: '', blobUrl: null, downloaded: false });
  item.rowEl.classList.remove('done', 'error');
  item.progressEl.classList.add('hidden');
  item.barEl.style.width = '0%';
  item.metaEl.textContent = formatBytes(item.originalSize);
  item.dlEl.classList.add('hidden');
  item.recompressEl.classList.add('hidden');
  item.previewEl.classList.add('hidden');
  // Restore span if it became an anchor
  if (item.dlEl.tagName === 'A') {
    const span = document.createElement('span');
    span.className = item.dlEl.className;
    span.innerHTML = item.dlEl.innerHTML;
    item.dlEl.replaceWith(span);
    item.dlEl = span;
  }
  setStatusIcon(item, 'queued');
  updateUnsavedWork();
  refreshUI();
}

function removeItem(id) {
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;
  const item = items[idx];
  if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
  item.rowEl.remove();
  items.splice(idx, 1);
  updateUnsavedWork();
  refreshUI();
}

// =====================
// BEFORE/AFTER PREVIEW
// =====================
function openPreview(item) {
  if (item.type !== 'image' || !item.blobUrl) return;
  const modal   = document.getElementById('preview-modal');
  const after   = document.getElementById('ba-after');
  const before  = document.getElementById('ba-before');
  const divider = document.getElementById('ba-divider');
  const container = document.getElementById('ba-container');

  // Load original via object URL
  const origUrl = URL.createObjectURL(item.file);
  before.src = origUrl;
  after.src  = item.blobUrl;

  // Stats
  document.getElementById('ps-original').textContent   = formatBytes(item.originalSize);
  document.getElementById('ps-compressed').textContent = formatBytes(item.compressedSize);
  const pct = ((1 - item.compressedSize / item.originalSize) * 100);
  document.getElementById('ps-saved').textContent =
    pct >= 0 ? `-${pct.toFixed(1)}%` : `+${Math.abs(pct).toFixed(1)}%`;

  // Reset divider to center
  setDivider(50, container, before, divider);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  before.onload = () => URL.revokeObjectURL(origUrl);

  // Drag to compare
  let dragging = false;
  function setDividerFromEvent(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setDivider(pct, container, before, divider);
  }
  container.addEventListener('mousedown',  () => { dragging = true; });
  container.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
  window.addEventListener('mousemove',  e => { if (dragging) setDividerFromEvent(e); });
  window.addEventListener('touchmove',  e => { if (dragging) setDividerFromEvent(e); }, { passive: true });
  window.addEventListener('mouseup',   () => { dragging = false; }, { once: false });
  window.addEventListener('touchend',  () => { dragging = false; }, { once: false });
}

function setDivider(pct, container, beforeImg, divider) {
  beforeImg.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
  divider.style.left = pct + '%';
}

function closePreview() {
  document.getElementById('preview-modal').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('preview-close').addEventListener('click', closePreview);
document.getElementById('preview-backdrop').addEventListener('click', closePreview);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });

// =====================
// REFRESH UI
// =====================
function refreshUI() {
  fileCountEl.textContent = items.length;
  const heading = document.querySelector('[data-i18n="files-heading"]');
  if (heading) heading.textContent = t('files-heading', { count: items.length });
  queueSection.classList.toggle('hidden', items.length === 0);

  const allDone = items.length > 0 && items.every(i => i.status === 'done' || i.status === 'error');
  compressBtn.disabled = items.length === 0 || isProcessing || allDone;

  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) cancelBtn.classList.toggle('hidden', !isProcessing);

  if (isProcessing) {
    const done = items.filter(i => i.status === 'done' || i.status === 'error').length;
    compressBtn.textContent = t('compressing-progress', { done, total: items.length });
  } else {
    compressBtn.textContent = t('compress-btn');
  }

  updateSettingsVisibility();

  const done = items.filter(i => i.status === 'done');
  if (done.length > 0) {
    const totOrig = done.reduce((s, i) => s + i.originalSize, 0);
    const totComp = done.reduce((s, i) => s + i.compressedSize, 0);
    totalOrig.textContent = formatBytes(totOrig);
    totalComp.textContent = formatBytes(totComp);
    const pct = totOrig > 0 ? (1 - totComp / totOrig) * 100 : 0;
    totalSaved.textContent = pct >= 0 ? `-${pct.toFixed(1)}%` : `+${Math.abs(pct).toFixed(1)}%`;
    summaryEl.classList.remove('hidden');
    downloadAllBtn.classList.toggle('hidden', done.length < 2);
    shareBtn.classList.remove('hidden');
  } else {
    summaryEl.classList.add('hidden');
    downloadAllBtn.classList.add('hidden');
    shareBtn.classList.add('hidden');
  }
}

// =====================
// FILE HANDLING
// =====================
function addFiles(fileList) {
  clearError();
  const arr = Array.from(fileList || []);
  let added = 0, dupes = 0;
  for (const file of arr) {
    const type = detectType(file);
    if (!type) continue;
    if (items.some(i => i.file.name === file.name && i.file.size === file.size)) {
      dupes++;
      continue;
    }
    const item = {
      id: nextId++, file, type,
      status: 'queued',
      originalSize: file.size,
      compressedBlob: null,
      compressedSize: 0,
      compressedName: '',
      blobUrl: null,
      downloaded: false,
    };
    items.push(item);
    const row = createFileRow(item);
    fileListEl.appendChild(row);
    added++;

    // Auto-suggest for images (async, non-blocking)
    attachSuggestion(item).catch(() => {});
  }
  if (added === 0 && arr.length > 0 && dupes === 0) {
    showError(t('no-valid-files'));
  } else if (dupes > 0 && added === 0) {
    showToast(t('duplicates-skipped', { count: dupes }), 'info');
  } else if (dupes > 0) {
    showToast(t('duplicates-skipped', { count: dupes }), 'info');
  }
  refreshUI();
}

dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { addFiles(e.target.files); fileInput.value = ''; });

// Full-page drag-drop
let dragCounter = 0;
document.addEventListener('dragenter', e => {
  if (!e.dataTransfer.types.includes('Files')) return;
  e.preventDefault();
  dragCounter++;
  dragOverlay.classList.remove('hidden');
});
document.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; dragOverlay.classList.add('hidden'); }
});
document.addEventListener('dragover', e => {
  if (!e.dataTransfer.types.includes('Files')) return;
  e.preventDefault();
});
document.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  dragOverlay.classList.add('hidden');
  addFiles(e.dataTransfer.files);
});

// Dropzone hover state
['dragenter', 'dragover'].forEach(evt => {
  dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('dragover'); });
});

clearBtn.addEventListener('click', () => {
  if (isProcessing) return;
  items.forEach(i => { if (i.blobUrl) URL.revokeObjectURL(i.blobUrl); });
  items.length = 0;
  fileListEl.innerHTML = '';
  clearError();
  hasUnsavedWork = false;
  refreshUI();
});

function wireDownload(item) {
  const a = document.createElement('a');
  a.className = item.dlEl.className;
  a.innerHTML = item.dlEl.innerHTML;
  a.href = item.blobUrl;
  a.download = item.compressedName;
  a.target = '_blank';
  a.rel = 'noopener';
  a.addEventListener('click', () => {
    item.downloaded = true;
    updateUnsavedWork();
    setTimeout(() => {
      const lbl = a.querySelector('.dl-label');
      if (lbl) { lbl.textContent = t('downloaded'); a.classList.add('downloaded'); }
    }, 300);
  });
  item.dlEl.replaceWith(a);
  item.dlEl = a;
  item.dlEl.classList.remove('hidden');
  item.recompressEl.classList.remove('hidden');
  if (item.type === 'image') item.previewEl.classList.remove('hidden');
}

// =====================
// COMPRESSION
// =====================
compressBtn.addEventListener('click', async () => {
  if (isProcessing) return;
  isProcessing = true;
  cancelRequested = false;
  clearError();
  compressBtn.disabled = true;
  const settings = getSettings();

  for (const item of items) {
    if (cancelRequested) break;
    if (item.status === 'done' || item.status === 'error') continue;
    item.status = 'processing';
    item.rowEl.classList.remove('done', 'error');
    item.progressEl.classList.remove('hidden');
    item.barEl.style.width = '2%';
    item.metaEl.textContent = `${formatBytes(item.originalSize)} · ${t('preparing')}`;
    setStatusIcon(item, 'processing');

    try {
      let result;
      if (item.type === 'pdf') {
        result = await compressPdf(item.file, settings, (page, total) => {
          const pct = (page / total) * 100;
          item.barEl.style.width = pct + '%';
          item.metaEl.textContent = `${formatBytes(item.originalSize)} · ${t('compressing', { page, total })}`;
        });
      } else {
        item.barEl.style.width = '50%';
        item.metaEl.textContent = `${formatBytes(item.originalSize)} · ${t('preparing')}`;
        result = await compressImage(item.file, settings);
      }

      const { blob, ext } = result;
      item.compressedBlob = blob;
      item.compressedSize = blob.size;
      item.compressedName = `${baseName(item.file.name)}-compressed.${ext}`;
      item.blobUrl = URL.createObjectURL(blob);
      item.status = 'done';
      item.rowEl.classList.add('done');
      item.barEl.style.width = '100%';
      setStatusIcon(item, 'done');

      const pct = (1 - blob.size / item.originalSize) * 100;
      const lbl = pct >= 0
        ? `<span class="size-saved">-${pct.toFixed(1)}%</span>`
        : `<span style="color:#ef4444;font-weight:600">+${Math.abs(pct).toFixed(1)}%</span>`;
      item.metaEl.innerHTML = `${formatBytes(item.originalSize)} → ${formatBytes(blob.size)} · ${lbl}`;

      wireDownload(item);
    } catch (err) {
      console.error(err);
      item.status = 'error';
      item.rowEl.classList.add('error');
      item.metaEl.textContent = t('failed', { msg: err?.message || err });
      setStatusIcon(item, 'error');
    }
    updateUnsavedWork();
    refreshUI();
  }

  isProcessing = false;
  cancelRequested = false;
  refreshUI();
});

// =====================
// DOWNLOAD ALL (ZIP)
// =====================
downloadAllBtn.addEventListener('click', async () => {
  const done = items.filter(i => i.status === 'done' && i.compressedBlob);
  if (done.length === 0) return;
  downloadAllBtn.disabled = true;
  const origHTML = downloadAllBtn.innerHTML;
  downloadAllBtn.textContent = t('building-zip');
  try {
    await ensureZipLib();
    const zip = new window.JSZip();
    done.forEach(i => zip.file(i.compressedName, i.compressedBlob));
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url; a.download = 'compressed-files.zip';
    a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    done.forEach(i => { i.downloaded = true; });
    updateUnsavedWork();

    showToast(t('zip-downloaded'), 'success');
    setTimeout(() => {
      if (!isProcessing) {
        items.forEach(i => { if (i.blobUrl) URL.revokeObjectURL(i.blobUrl); });
        items.length = 0;
        fileListEl.innerHTML = '';
        hasUnsavedWork = false;
        refreshUI();
        showToast(t('queue-cleared'), 'info');
      }
    }, 2000);
  } catch (err) {
    showError(t('could-not-build-zip', { msg: err?.message || err }));
  } finally {
    downloadAllBtn.disabled = false;
    downloadAllBtn.innerHTML = origHTML;
  }
});

// =====================
// SHARE CARD
// =====================
shareBtn.addEventListener('click', () => {
  const done = items.filter(i => i.status === 'done');
  if (done.length === 0) return;
  const origB = done.reduce((s, i) => s + i.originalSize, 0);
  const compB = done.reduce((s, i) => s + i.compressedSize, 0);
  const pct = origB > 0 ? (1 - compB / origB) * 100 : 0;

  const canvas = buildShareCard({
    fileCount: done.length, savedPct: pct, origBytes: origB, compBytes: compB, lang: currentLang,
    labels: {
      smaller: t('share-smaller'), files: t('share-files'),
      before:  t('share-before'),  after:  t('share-after'),
      tagline: t('share-tagline'),
    },
  });

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sralify-savings.png';
    a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
});

// =====================
// LANG TOGGLE
// =====================
document.getElementById('lang-btn')?.addEventListener('click', () => {
  setLang(currentLang === 'en' ? 'km' : 'en');
  document.querySelectorAll('.file-row').forEach(row => {
    const lbl = row.querySelector('.dl-label');
    if (lbl) lbl.textContent = t('download');
    const rm  = row.querySelector('.btn-remove');
    if (rm)  rm.title = t('remove');
    const rc = row.querySelector('.btn-recompress');
    if (rc)  rc.title = t('recompress');
    const pv = row.querySelector('.btn-preview');
    if (pv)  pv.title = t('preview');
  });
});

// =====================
// THEME TOGGLE (DARK MODE)
// =====================
function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  if (sunIcon && moonIcon) {
    sunIcon.style.display = isDark ? '' : 'none';
    moonIcon.style.display = isDark ? 'none' : '';
  }
}

document.getElementById('theme-btn')?.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', !isDark);
  localStorage.setItem('sralify-theme', isDark ? 'light' : 'dark');
  updateThemeIcon();
});

// Restore theme from localStorage (override OS preference if user set manually)
const savedTheme = localStorage.getItem('sralify-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}
updateThemeIcon();

// =====================
// CANCEL
// =====================
document.getElementById('cancel-btn')?.addEventListener('click', () => {
  cancelRequested = true;
  showToast(t('cancel-requested'), 'info');
});

// =====================
// KEYBOARD SHORTCUTS
// =====================
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !compressBtn.disabled && !isProcessing) compressBtn.click();
  if (e.key === 'Escape' && !errorEl.classList.contains('hidden')) clearError();
});

// =====================
// UNLOAD WARNING
// =====================
window.addEventListener('beforeunload', e => {
  if (hasUnsavedWork) { e.preventDefault(); e.returnValue = ''; }
});

// =====================
// PWA INSTALL
// =====================
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPromptEvent = e;
  if (!localStorage.getItem('sralify-install-dismissed')) {
    document.getElementById('install-banner').classList.add('visible');
  }
});

if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  localStorage.setItem('sralify-install-dismissed', '1');
}

document.getElementById('install-btn-main')?.addEventListener('click', async () => {
  if (!installPromptEvent) return;
  const banner = document.getElementById('install-banner');
  installPromptEvent.prompt();
  const result = await installPromptEvent.userChoice;
  if (result.outcome === 'accepted') {
    showToast(t('app-installed'), 'success');
    if (banner) banner.classList.remove('visible');
  }
  installPromptEvent = null;
});

document.getElementById('install-dismiss')?.addEventListener('click', () => {
  document.getElementById('install-banner').classList.remove('visible');
  localStorage.setItem('sralify-install-dismissed', '1');
});

window.addEventListener('appinstalled', () => {
  document.getElementById('install-banner').classList.remove('visible');
  showToast(t('app-installed'), 'success');
});

// =====================
// SERVICE WORKER
// =====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// =====================
// INIT
// =====================
loadSettings();
initI18n();
