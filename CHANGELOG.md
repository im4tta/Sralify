# Changelog

## [3.0.0] - 2026-07-06

### 🎨 Complete Visual Redesign

**Ultra-Lightweight CSS**
- ❌ Removed Tailwind (23 KB) + styles.css (6 KB) = **29 KB → 7 KB gzipped** (77% CSS reduction)
- ✅ New `sral.css` — hand-crafted, zero bloat, built on CSS custom properties
- ✅ No build step needed — `npm run build:css` removed

**Modern Aesthetic**
- Animated radial gradient background (subtle rose glows, top-left + bottom-right)
- Glassmorphism everywhere: `backdrop-filter: blur(12px)` + semi-transparent cards
- File rows slide in with spring animation (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Buttons lift on hover with magnetic feedback
- Bold **800** weight brand name with rose `Sral` emphasis (meaning "light" in Khmer)

### ✨ New Features

**1. Before/After Preview Slider**
- Click 👁️ icon on compressed images to open comparison modal
- Interactive drag-to-compare: slide left/right to reveal original vs compressed
- Shows file sizes + savings % below the slider
- Pure vanilla JS, zero deps

**2. Smart Compression Suggestions**
- AI-lite pixel analysis: samples 80×80 canvas, calculates brightness/colorfulness/edge density
- Detects documents (high edges + low color) → suggests **Low** preset
- Detects vibrant photos (high color + brightness) → suggests **Extreme** preset
- Chip appears below filename, click to auto-apply + dismiss
- ~30 lines of Canvas math, zero library overhead

**3. Enhanced File Row UX**
- Status icons now show ✓ (done) / ⚠ (error) with color-coded backgrounds
- Preview button for images (opens Before/After modal)
- Re-compress button visible after completion
- Downloaded state shows "Downloaded ✓" + grays out button

**4. Improved Settings Persistence**
- All presets + sliders persist in `localStorage`
- Auto-restores last-used quality/scale/format/resize on page load

### 🔧 Infrastructure

**Service Worker**
- Updated cache from `sralify-v2` → `sralify-v3`
- Now caches `sral.css` instead of `tailwind.css` + `styles.css`

**Favicon Redesign**
- New gradient rose rounded-square with bold white "S" lettermark
- Generated via pure Node.js script (`build/gen-favicon.js`) — no Photoshop needed
- SVG favicon for modern browsers, PNGs for legacy
- Sizes: 16×16, 32×32, 192×192, 512×512, 180×180 (Apple touch)

**README Overhaul**
- Modernized structure with feature highlights
- "Why Sralify is different" comparison table
- Clearer architecture explanation
- Contributing ideas + roadmap

### 🐛 Bug Fixes
- Fixed preset card text not visible (buttons didn't inherit `color` from body)
- Auto-clear after "Download all" now waits 2s + shows toast
- Unload warning only fires if files are compressed but not downloaded

### 📦 Dependencies
- Removed `@tailwindcss/cli` and `tailwindcss` from devDependencies
- Zero runtime dependencies (everything lazy-loaded from CDN)

### 🚀 Performance
- **Initial page weight**: ~30 KB → ~18 KB (40% reduction after CSS rewrite)
- **Estimated gzipped**: ~10 KB total (HTML + CSS + app.js)
- Before/After modal loads <1 KB extra (inline in HTML)
- Smart suggestions add ~1 KB to app.js (pure Canvas, no ML libs)

---

## [2.0.0] - Previous version
- PWA install banner
- Dark mode support
- Bilingual UI (EN/KM)
- Cancel button during compression
- Keyboard shortcuts (Enter to compress, Esc to dismiss errors)
- Full-page drag overlay
- Toast notifications
- Auto-clear after ZIP download
- Re-compress button per file
- Compression history tracking

---

## [1.0.0] - Initial release
- PDF + image compression (JPG/PNG/WebP)
- Batch processing with queue
- Presets (Low/Recommended/Extreme)
- Manual quality/scale sliders
- Image format conversion + resize
- Download all as ZIP
- Shareable savings card
- 100% client-side processing
- PWA with offline support
- i18n (English + Khmer)
