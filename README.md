# Painted

Painted is a private, browser-based painting-by-numbers maker. Upload a photograph, choose a palette size and detail level, then download a printable numbered template and its colour guide.

## Features

- Processes images entirely in the browser — photographs are never uploaded
- Reduces an image to 6–18 representative paint colours
- Smooths and merges small areas to create a more practical painting plan
- Generates a numbered worksheet and full-colour reference
- Exports either view as a high-resolution PNG
- Includes a print-friendly layout and a built-in sample image
- Responsive and keyboard accessible

## Run locally

No build step or dependencies are required. Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## How it works

The image is resized to a manageable shape grid and quantised using deterministic k-means colour clustering. A spatial smoothing pass removes isolated pixels, connected-component analysis merges tiny regions into neighbouring colours, and the final regions are labelled at their visual centres. All processing uses the browser's Canvas API.

## Deployment

The site is deployed to GitHub Pages by the workflow in `.github/workflows/pages.yml` whenever the `main` branch changes.

## Privacy

There is no backend, analytics or image upload. Source images stay within the browser tab.

## Licence

MIT
