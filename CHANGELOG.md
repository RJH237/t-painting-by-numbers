# Changelog

All notable changes to Painted are recorded here.

## 0.8.0 — 2026-07-22

### Fixed

- Allow an enlarged painting to be dragged left, right, up and down on phones
- Preserve redraw-based pinch zoom so the painting boundaries and number labels increase in size together
- Keep `device-layout.js` loaded as an ES module; the failed 0.7.1 attempt loaded it as a classic script, causing its `export` syntax to fail and preventing phone gesture mode from being installed

### Changed

- Use a mobile-only block scroll viewport rather than the flex layout that could make vertical overflow unreachable on iOS
- Keep the existing canvas rendering engine, adaptive maximum zoom and full-screen phone studio unchanged

### Added

- Regression checks requiring the phone layout detector to remain module-loaded
- Regression checks for pinch-triggered canvas redraws, horizontal and vertical panning, and independent two-axis overflow
- A label-scaling test requiring visible number text to grow as canvas zoom increases

## 0.7.0 — 2026-07-22

### Changed

- Turn the phone painting page into an edge-to-edge, viewport-filling workspace
- Replace the bottom-sheet paintbox with an always-visible vertical colour wheel on the right
- Reduce phone chrome and canvas padding so the painting receives substantially more screen space

### Improved

- Keep all 120 numbered colours reachable with smooth independent vertical scrolling
- Retain pinch zoom, one-finger panning, sharp adaptive labels and safe-area support in the new layout

## 0.6.1 — 2026-07-22

### Fixed

- Calculate a painting-specific maximum zoom so every connected region can display its number on phones and desktops
- Keep the generated pixel grid unchanged while allowing zoom beyond the former 500% cap when needed

### Added

- A permanent regression test requiring every region label, including one-cell three-digit labels, to be visible at maximum zoom

## 0.6.0 — 2026-07-22

### Added

- Mouse-wheel and trackpad zoom directly over the painting on desktop
- Two-finger pinch zoom and one-finger panning in the phone painting workspace
- Focal-point preservation so the location under the pointer or pinch midpoint stays in view while zooming

### Improved

- Continuous gesture zoom within the existing 50–500% range while retaining the toolbar controls
- Touch gesture handling that prevents a pan or pinch from accidentally painting an area

## 0.5.0 — 2026-07-22

### Added

- Automatic phone-versus-desktop layout detection using browser mobile signals and touch-screen capabilities
- A canvas-first phone workspace sized to the visible screen and updated safely after rotation
- A mobile paintbox drawer with large swatches, clear open/close controls and keyboard-accessible focus handling

### Improved

- Compact phone navigation, gallery cards, headings, progress display and painting controls
- Touch target sizes, canvas panning and mobile safe-area support without changing the desktop layout

## 0.4.1 — 2026-07-22

### Fixed

- Redraw the canvas at each zoom level and the screen's pixel density so numbers and boundaries remain sharp at high zoom
- Fit each number to usable space around its actual anchor, preventing small three-digit labels from overlapping nearby regions
- Allow the smallest region labels to appear once zoom makes them genuinely readable

## 0.4.0 — 2026-07-22

### Changed

- Painting links now open their individual artwork page in a new browser tab
- Increased the canvas zoom range from 55–175% to 50–500%
- Made number labels zoom-aware so small labels stay hidden until they become readable
- Changed painting completion from whole-colour filling to one connected area per click
- Changed painting progress to count completed connected areas; colour ticks now appear only after every matching area is complete

### Added

- Automatic migration of browser progress saved by earlier colour-level releases
- Connected-region tests covering separate same-colour areas and legacy progress migration

## 0.3.0 — 2026-07-22

### Changed

- Split the single-page app into separate Gallery, painting, How to play, and About pages
- Gave every artwork a shareable URL using `paint.html?id=…`
- Moved artwork data into one shared module so the gallery and painting pages stay consistent

### Added

- Site-wide navigation and dedicated page layouts
- A detailed five-step playing guide and a standalone project, privacy, and artwork-credits page
- Gallery links that preserve existing per-painting browser progress without changing storage keys

## 0.2.1 — 2026-07-22

### Improved

- Smoothed isolated colour cells into clearer, more natural numbered paint regions while retaining all 120 palette colours

## 0.2.0 — 2026-07-22

### Changed

- Rebuilt the product around an on-site classic-painting gallery instead of user uploads
- Replaced printable templates and PNG downloads with an interactive painting canvas
- Increased every artwork to a deterministic 120-colour palette

### Added

- Four public-domain works: *The Starry Night*, *The Great Wave*, *Girl with a Pearl Earring*, and *Mona Lisa*
- Correct-number colour matching, numbered-area highlighting, original reference view, and canvas zoom
- Automatic per-painting progress persistence in browser local storage
- Gallery progress indicators, resume actions, reset controls, and a completion state
- Artwork source credits and responsive palette controls

## 0.1.0 — 2026-07-22

### Added

- Local photo upload with drag-and-drop support
- Deterministic colour clustering with a 6–18 colour palette
- Adjustable detail level and small-region cleanup
- Printable numbered template and full-colour guide
- Paint palette with numbered hexadecimal colour references
- High-resolution PNG downloads and a print-friendly view
- Built-in sample artwork, responsive layout and keyboard-friendly controls
- GitHub Pages deployment workflow

### Privacy

- Images are processed entirely in the browser and are never uploaded
