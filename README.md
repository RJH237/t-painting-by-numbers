# Painted

Painted is a browser-based painting-by-numbers gallery. Choose a classic public-domain artwork and complete it online, one numbered colour at a time.

## Features

- Four classic paintings: *The Starry Night*, *The Great Wave*, *Girl with a Pearl Earring*, and *Mona Lisa*
- A deterministic 120-colour palette for every painting
- Interactive numbered canvas with correct-colour matching
- Optional original reference view and numbered-area hint
- Per-painting progress saved in browser local storage
- Responsive layout, canvas zoom, and keyboard completion fallback
- No accounts, uploads, printing, or image downloads

## Run locally

No build step or dependencies are required. Serve the folder locally so the remote public-domain images can be processed by the Canvas API:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## How it works

When a painting is selected, its source reproduction is resized to a 156-pixel shape grid and reduced to 120 representative colours using deterministic colour clustering. The canvas renders numbered boundaries over unfinished colours. Selecting a numbered swatch and clicking the same number fills every area belonging to that colour.

Only the list of completed colour numbers is stored, using `localStorage` in the user's browser. Nothing is uploaded to a server.

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
