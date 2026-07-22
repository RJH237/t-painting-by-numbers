# Changelog

All notable changes to Painted are recorded here.

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
