# Painted

Painted is a browser-based painting-by-numbers gallery. Choose a classic public-domain artwork and complete it online, one numbered colour at a time.

## Features

- Four classic paintings: *The Starry Night*, *The Great Wave*, *Girl with a Pearl Earring*, and *Mona Lisa*
- Separate Gallery, painting, How to play, and About pages with shareable painting URLs
- Gallery actions open each painting in a new browser tab
- A deterministic 120-colour palette for every painting
- Interactive numbered canvas that fills only the connected area clicked
- Optional original reference view and numbered-area hint
- Per-area painting progress saved in browser local storage
- Automatic desktop/phone layout detection, with a canvas-first mobile workspace and bottom-sheet paintbox
- Touch-sized phone controls, orientation-safe sizing, zoom up to 500%, and sharp, zoom-aware number labels
- Pointer-centred mouse-wheel zoom on desktop and focal-point pinch zoom with one-finger panning on phones
- No accounts, uploads, printing, or image downloads

## Run locally

No build step or dependencies are required. Serve the folder locally so the remote public-domain images can be processed by the Canvas API:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Individual canvases use URLs such as
`paint.html?id=starry-night` while sharing the same painting engine.

## How it works

When a painting page opens, its source reproduction is resized to a 156-pixel shape grid and reduced to 120 representative colours using deterministic colour clustering. The canvas identifies each group of horizontally or vertically connected cells as a distinct paint area. Selecting a numbered swatch and clicking the same number fills only that connected area.

Numbers that would be illegibly small are hidden at the fitted view and appear automatically as zoom makes their areas large enough. The canvas is redrawn at every zoom level and at the screen's pixel density, so boundaries and text remain sharp rather than enlarging a fixed-resolution image. Zoom ranges from 50% to 500%. On desktop, scrolling over the painting zooms around the pointer. On phones, pinching zooms around the midpoint of the gesture and one-finger dragging pans the enlarged painting.

Only the list of completed connected areas is stored, using `localStorage` in the user's browser. Existing colour-level progress from earlier releases is migrated automatically. Nothing is uploaded to a server.

## Tests

Run the JavaScript syntax checks and rendering/connected-region tests with:

```bash
node --check app.js && node --check gallery.js && node --check canvas-rendering.js && node --check canvas-gestures.js && node --check device-layout.js && node --test tests/*.test.mjs
```

## Artwork sources

The source reproductions are public-domain works from Wikimedia Commons:

- [The Starry Night](https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg)
- [The Great Wave off Kanagawa](https://commons.wikimedia.org/wiki/File:The_Great_Wave_off_Kanagawa.jpg)
- [Girl with a Pearl Earring](https://commons.wikimedia.org/wiki/File:Girl_with_a_Pearl_Earring.jpg)
- [Mona Lisa](https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg)

## Deployment

The site is deployed to GitHub Pages by `.github/workflows/pages.yml` whenever the `main` branch changes.

## Licence

The application code is MIT licensed. Artwork source and public-domain information are linked above.
