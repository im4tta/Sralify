# Requirements Document

## Introduction

Sralify's brand name means "light" in Khmer. The current icon set (favicon, PWA icons, apple-touch-icon, and the in-app header logo) uses a rose-gradient rounded square with a white stylized "S" lettermark, but carries no visual reference to the "light" meaning. This feature rebrands the existing icon assets by adding a Feather_Motif (an animal feather, not a bird icon) alongside the existing S_Lettermark, to represent lightness while preserving brand recognition, color identity, and legibility at small sizes. This is a redesign of existing artwork and regeneration of existing files — no new build tooling, file paths, or manifest entries are introduced.

## Glossary

- **Favicon_SVG**: The master vector icon source file at `assets/favicon.svg`, containing the rounded-square background, gradient fill, and lettermark artwork.
- **Icon_Generator**: The Node.js script at `build/gen-favicon.js` that rasterizes Favicon_SVG into PNG files using the `sharp` library.
- **Icon_PNG_Set**: The collection of generated PNG files: `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `favicon-192.png`, and `favicon-512.png` in the `assets` directory.
- **Header_Logo**: The inline SVG markup rendered inside the `.logo` container in the header of `index.html`.
- **S_Lettermark**: The existing stylized letter "S" glyph, rendered as a stroked path in Favicon_SVG and referenced visually in Header_Logo.
- **Feather_Motif**: A visual element depicting a single animal feather (quill shaft and vane barbs), added to represent lightness. It SHALL NOT depict a bird, bird silhouette, or bird-related iconography.
- **Brand_Rose_Gradient**: The existing two-stop linear gradient background used in Favicon_SVG, with stop colors `#f43f5e` and `#be123c`.
- **Foreground_Color**: The existing near-white color (`rgba(255,255,255,0.95)`) used for the S_Lettermark stroke in Favicon_SVG.
- **Maskable_Safe_Zone**: The centered circular region covering 80% of the icon's width/height, within which foreground artwork must remain visible when an operating system applies a mask shape to a PWA icon marked `purpose: "any maskable"`.

## Requirements

### Requirement 1: Redesign Favicon_SVG with Feather_Motif and S_Lettermark

**User Story:** As a brand stakeholder, I want the favicon source artwork updated to combine a feather motif with the existing S lettermark, so that the icon visually reflects Sralify's "light" meaning while keeping the recognizable S shape.

#### Acceptance Criteria

1. THE Favicon_SVG SHALL render one Feather_Motif combined with the S_Lettermark within the existing 512×512 rounded-square canvas.
2. THE Favicon_SVG SHALL depict the Feather_Motif as an animal feather shape composed of a quill shaft and vane barbs.
3. THE Favicon_SVG SHALL render the Feather_Motif and the S_Lettermark using the Foreground_Color.
4. THE Favicon_SVG SHALL preserve the Brand_Rose_Gradient as the background fill.
5. THE Favicon_SVG SHALL position all Feather_Motif and S_Lettermark geometry within the Maskable_Safe_Zone.

### Requirement 2: Legibility at small rendered sizes

**User Story:** As a browser user, I want the redesigned icon to stay legible as a favicon, so that I can recognize Sralify in browser tabs, bookmarks, and app launchers.

#### Acceptance Criteria

1. WHEN Favicon_SVG is rasterized to 16×16 pixels, THE Icon_PNG_Set SHALL display the S_Lettermark as a distinguishable shape against the Brand_Rose_Gradient background.
2. THE Favicon_SVG SHALL use stroke or fill widths for Feather_Motif details no thinner than the S_Lettermark stroke width (46 SVG units at 512×512 scale).
3. IF individual Feather_Motif vane barbs are not distinguishable when Favicon_SVG is rasterized to 16×16 pixels, THEN THE Favicon_SVG SHALL still present a simplified feather silhouette distinguishable at 32×32 pixels and above.
4. WHEN the simplified feather silhouette described in Acceptance Criterion 3 is displayed, THE Favicon_SVG SHALL omit internal vane-barb detail lines from that silhouette, showing only its outer feather outline.
5. THE Favicon_SVG SHALL limit the combined Feather_Motif and S_Lettermark artwork to no more than two distinct foreground shapes, so that overlapping detail does not merge into an unrecognizable mass at 16×16 pixels.

### Requirement 3: Regenerate PNG icon assets via existing build script

**User Story:** As a developer, I want to regenerate all PNG icon sizes from the updated Favicon_SVG using the existing sharp-based script, so that every icon file stays in sync without manual per-file editing.

#### Acceptance Criteria

1. WHEN Icon_Generator is executed against the redesigned Favicon_SVG, THE Icon_Generator SHALL produce `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `favicon-192.png`, and `favicon-512.png` in the `assets` directory.
2. THE Icon_Generator SHALL rasterize the redesigned Favicon_SVG without requiring modification of `build/gen-favicon.js`.
3. WHEN Icon_Generator completes, THE Icon_Generator SHALL overwrite each existing file in the Icon_PNG_Set with a PNG rendered from the redesigned Favicon_SVG.
4. THE redesigned Favicon_SVG SHALL use well-formed SVG markup that Icon_Generator's existing error handling accepts without modification, consistent with Icon_Generator's current behavior of exiting on unreadable or malformed SVG input.

### Requirement 4: Update in-app header logo to match redesigned icon

**User Story:** As a user browsing the app, I want the header logo mark to match the redesigned favicon, so that the brand identity is consistent between the browser tab and the running application.

#### Acceptance Criteria

1. THE Header_Logo SHALL depict the same Feather_Motif and S_Lettermark combination shown in Favicon_SVG.
2. THE Header_Logo SHALL render within the existing `.logo` container dimensions (2.5rem × 2.5rem) defined in `css/sral.css`, without requiring changes to that container's width, height, or background.
3. THE Header_Logo SHALL use the Foreground_Color for its strokes or fills, displayed over the existing `.logo` Brand_Rose_Gradient background.

### Requirement 5: Preserve brand color consistency

**User Story:** As a brand stakeholder, I want the redesigned icons to use Sralify's existing rose brand colors, so that the rebrand changes the artwork without changing the established color identity.

#### Acceptance Criteria

1. THE Favicon_SVG SHALL use the existing Brand_Rose_Gradient stop colors `#f43f5e` and `#be123c` for its background.
2. THE manifest.json `theme_color` value SHALL remain `#f43f5e` after the icon redesign.
3. IF the Feather_Motif requires a color distinct from the Foreground_Color, THEN THE Favicon_SVG SHALL restrict that color to a rose palette shade already defined in `css/sral.css` (`--rose-100` through `--rose-900`).

### Requirement 6: Maintain file paths and references

**User Story:** As a developer, I want the icon redesign limited to artwork changes, so that existing file names, HTML link tags, and manifest entries continue to work without additional code changes.

#### Acceptance Criteria

1. THE icon redesign SHALL preserve the existing file names for every member of the Icon_PNG_Set.
2. THE icon redesign SHALL preserve the existing `<link>` href values in `index.html` that reference Favicon_SVG and the Icon_PNG_Set.
3. THE icon redesign SHALL preserve the existing `icons` array `src` values in `manifest.json`.
