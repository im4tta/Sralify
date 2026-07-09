# Implementation Plan: Icon Redesign - Feather Motif

## Overview

This implementation plan covers the visual redesign of Sralify's icon assets by adding a Feather_Motif alongside the existing S_Lettermark. The feather represents "lightness," connecting visually to the meaning of "Sralify" in Khmer ("light"). This is purely a visual redesign—no new files, build tooling, or file paths are introduced.

## Tasks

- [x] 1. Design and implement Feather_Motif in favicon.svg
  - Create a simplified feather silhouette path at 512×512 scale
  - Ensure minimum stroke/fill width ≥46 SVG units (matching S_Lettermark stroke)
  - Position feather within Maskable_Safe_Zone (centered circle of radius 204.8 units)
  - Use Foreground_Color `rgba(255,255,255,0.95)` for the feather
  - Preserve existing Brand_Rose_Gradient background and S_Lettermark
  - Limit to 2 total foreground shapes (feather + S)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.5_

- [x] 2. Regenerate PNG icon assets
  - Run `node build/gen-favicon.js` to generate all PNG sizes
  - Verify all 5 PNG files are created: favicon-16.png, favicon-32.png, apple-touch-icon.png, favicon-192.png, favicon-512.png
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Visual verification of favicon assets
  - Inspect favicon-16.png at actual size - verify S_Lettermark is distinguishable
  - Inspect favicon-32.png at actual size - verify both elements are clearly visible
  - Inspect larger PNGs (180×180, 192×192, 512×512) for full detail visibility
  - Apply circular mask mentally to verify both elements within safe zone
  - If 16×16 legibility is insufficient, iterate on Task 1 design
  - _Requirements: 2.1, 2.3, 2.4_

- [ ] 4. Update header logo SVG in index.html
  - Scale favicon SVG paths from 512×512 to 24×24 viewBox
  - Adjust stroke-width proportionally (46 → ~2.2)
  - Replace current download icon SVG with Feather_Motif + S_Lettermark combination
  - Use Foreground_Color for strokes/fills
  - Ensure rendering within existing .logo container (2.5rem × 2.5rem)
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5. Verify brand color consistency
  - Confirm favicon.svg uses Brand_Rose_Gradient stop colors #f43f5e and #be123c
  - Confirm manifest.json theme_color remains #f43f5e
  - Confirm header logo uses Foreground_Color against .logo background
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Final verification and checkpoint
  - Load app in browser and verify favicon appears correctly in browser tab
  - Verify header logo matches favicon design
  - Test PWA install to verify icon on home screen (optional)
  - Verify all file paths and manifest entries unchanged
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 6.1, 6.2, 6.3_

## Notes

- This is a visual design task requiring manual inspection rather than automated testing
- Property-based testing is NOT applicable (no pure functions, visual design work)
- The gen-favicon.js script requires no modifications - it handles any valid SVG
- The header logo must be manually synchronized with the favicon design
- If feather design requires iteration, return to Task 1 after visual verification
- Tasks 3 and 6 involve manual visual inspection checkpoints

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6"] }
  ]
}
```
