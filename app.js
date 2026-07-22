"use strict";

const COLOUR_COUNT = 120;
const DETAIL_EDGE = 156;
const STORAGE_PREFIX = "painted-masterpiece-v2-";

const PAINTINGS = {
  "starry-night": {
    title: "The Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/960px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
  },
  "great-wave": {
    title: "The Great Wave",
    artist: "After Katsushika Hokusai",
    year: "c. 1830",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/960px-The_Great_Wave_off_Kanagawa.jpg",
  },
  "pearl-earring": {
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "c. 1665",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Girl_with_a_Pearl_Earring.jpg/960px-Girl_with_a_Pearl_Earring.jpg",
  },
  "mona-lisa": {
    title: "Mona Lisa",
    artist: "Leonardo da Vinci",
    year: "c. 1503–1506",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/960px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
  },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  gallery: $("#gallery"),
  studio: $("#studio"),
  studioArtist: $("#studio-artist"),
  studioTitle: $("#studio-title"),
  backButton: $("#back-button"),
  loadingState: $("#loading-state"),
  loadingCopy: $("#loading-copy"),
  canvasStage: $("#canvas-stage"),
  canvasScroll: $("#canvas-scroll"),
  canvas: $("#paint-canvas"),
  referenceButton: $("#reference-button"),
  hintButton: $("#hint-button"),
  zoomOut: $("#zoom-out"),
  zoomIn: $("#zoom-in"),
  zoomOutput: $("#zoom-output"),
  paintStatus: $("#paint-status"),
  resetButton: $("#reset-button"),
  nextButton: $("#next-button"),
  selectedColour: $("#selected-colour"),
  paletteGrid: $("#palette-grid"),
  progressCount: $("#progress-count"),
  progressFill: $("#progress-fill"),
  progressPercent: $("#progress-percent"),
};

const state = {
  paintingId: null,
  result: null,
  filled: new Set(),
  selected: 0,
  reference: false,
  hint: false,
  zoom: 1,
  loadToken: 0,
};

$$('[data-start]').forEach((button) => {
  button.addEventListener("click", () => openPainting(button.dataset.start));
});

elements.backButton.addEventListener("click", () => {
  state.loadToken += 1;
  elements.studio.hidden = true;
  elements.gallery.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.referenceButton.addEventListener("click", () => {
  if (!state.result) return;
  state.reference = !state.reference;
  elements.referenceButton.setAttribute("aria-pressed", String(state.reference));
  elements.referenceButton.textContent = state.reference ? "Return to canvas" : "Show original";
  renderCanvas();
  setStatus(state.reference ? "Original shown for reference. Return to the canvas to keep painting." : instructionForSelection());
});

elements.hintButton.addEventListener("click", () => {
  if (!state.result || state.reference) return;
  state.hint = !state.hint;
  elements.hintButton.setAttribute("aria-pressed", String(state.hint));
  renderCanvas();
  setStatus(state.hint ? `Every area numbered ${state.selected + 1} is softly highlighted.` : instructionForSelection());
});

elements.zoomOut.addEventListener("click", () => setZoom(state.zoom - 0.15));
elements.zoomIn.addEventListener("click", () => setZoom(state.zoom + 0.15));
elements.nextButton.addEventListener("click", () => selectNextUnfinished(state.selected));
elements.resetButton.addEventListener("click", resetPainting);
elements.canvas.addEventListener("click", handleCanvasClick);
elements.canvas.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && state.result && !state.reference) {
    event.preventDefault();
    completeColour(state.selected, true);
  }
});
window.addEventListener("resize", () => state.result && setZoom(state.zoom));

updateGalleryProgress();

async function openPainting(id) {
  const painting = PAINTINGS[id];
  if (!painting) return;

  const token = ++state.loadToken;
  state.paintingId = id;
  state.result = null;
  state.filled = new Set();
  state.selected = 0;
  state.reference = false;
  state.hint = false;
  state.zoom = 1;

  elements.studio.hidden = false;
  elements.studioArtist.textContent = `${painting.artist} · ${painting.year}`;
  elements.studioTitle.textContent = painting.title;
  elements.loadingState.hidden = false;
  elements.canvasScroll.hidden = true;
  elements.paletteGrid.replaceChildren();
  elements.referenceButton.setAttribute("aria-pressed", "false");
  elements.referenceButton.textContent = "Show original";
  elements.hintButton.setAttribute("aria-pressed", "false");
  elements.progressCount.textContent = `0 / ${COLOUR_COUNT} colours`;
  elements.progressFill.style.width = "0%";
  elements.progressPercent.textContent = "0% complete";
  elements.loadingCopy.textContent = "Studying the colours in the original";
  setStatus("Preparing the numbered canvas…");
  elements.studio.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const image = await loadImage(painting.image);
    if (token !== state.loadToken) return;

    elements.loadingCopy.textContent = "Mixing 120 numbered colours";
    await nextFrame();
    const prepared = prepareImage(image, DETAIL_EDGE);
    const quantised = quantise(prepared.pixels, COLOUR_COUNT);
    ensureEveryColourIsUsed(quantised, prepared.pixels);

    elements.loadingCopy.textContent = "Drawing the numbered regions";
    await nextFrame();
    const sorted = sortPalette(quantised.colours, quantised.labels);
    const regions = findRegions(sorted.labels, prepared.width, prepared.height);

    state.result = {
      width: prepared.width,
      height: prepared.height,
      originalPixels: prepared.pixels,
      labels: sorted.labels,
      colours: sorted.colours,
      regions,
    };
    state.filled = loadProgress(id, sorted.colours.length);
    state.selected = firstUnfinished(0);
    elements.loadingState.hidden = true;
    elements.canvasScroll.hidden = false;
    renderPalette();
    renderCanvas();
    updateProgress();
    setStatus(instructionForSelection());
    requestAnimationFrame(() => setZoom(1));
  } catch (error) {
    console.error(error);
    if (token !== state.loadToken) return;
    elements.loadingState.querySelector("strong").textContent = "The canvas could not be prepared";
    elements.loadingCopy.textContent = "Please check your connection and try this painting again.";
    setStatus("The artwork image could not be loaded.", "error");
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${source}`));
    image.src = source;
  });
}

function prepareImage(image, targetLongEdge) {
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = ratio >= 1 ? targetLongEdge : Math.max(70, Math.round(targetLongEdge * ratio));
  const height = ratio >= 1 ? Math.max(70, Math.round(targetLongEdge / ratio)) : targetLongEdge;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const source = context.getImageData(0, 0, width, height).data;
  const pixels = new Uint8Array(width * height * 3);

  for (let i = 0, j = 0; i < source.length; i += 4, j += 3) {
    pixels[j] = source[i];
    pixels[j + 1] = source[i + 1];
    pixels[j + 2] = source[i + 2];
  }
  return { width, height, pixels };
}

function quantise(pixels, colourCount) {
  const pixelCount = pixels.length / 3;
  const colours = initialiseCentres(pixels, colourCount);
  const labels = new Uint8Array(pixelCount);

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const sums = Array.from({ length: colours.length }, () => [0, 0, 0, 0]);
    let changes = 0;

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 3;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      let best = 0;
      let bestDistance = Infinity;

      for (let colour = 0; colour < colours.length; colour += 1) {
        const distance = colourDistance(red, green, blue, colours[colour]);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = colour;
        }
      }
      if (labels[pixel] !== best) changes += 1;
      labels[pixel] = best;
      sums[best][0] += red;
      sums[best][1] += green;
      sums[best][2] += blue;
      sums[best][3] += 1;
    }

    for (let colour = 0; colour < colours.length; colour += 1) {
      if (!sums[colour][3]) continue;
      colours[colour] = [
        Math.round(sums[colour][0] / sums[colour][3]),
        Math.round(sums[colour][1] / sums[colour][3]),
        Math.round(sums[colour][2] / sums[colour][3]),
      ];
    }
    if (iteration > 1 && changes < pixelCount * 0.002) break;
  }
  return { colours, labels };
}

function initialiseCentres(pixels, count) {
  const pixelCount = pixels.length / 3;
  const average = [0, 0, 0];
  for (let offset = 0; offset < pixels.length; offset += 3) {
    average[0] += pixels[offset];
    average[1] += pixels[offset + 1];
    average[2] += pixels[offset + 2];
  }
  average[0] /= pixelCount;
  average[1] /= pixelCount;
  average[2] /= pixelCount;

  const centres = [];
  let firstIndex = 0;
  let furthest = -1;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 3;
    const distance = colourDistance(pixels[offset], pixels[offset + 1], pixels[offset + 2], average);
    if (distance > furthest) {
      furthest = distance;
      firstIndex = pixel;
    }
  }
  centres.push(readPixel(pixels, firstIndex));

  const stride = Math.max(1, Math.floor(pixelCount / 1600));
  while (centres.length < count) {
    let bestIndex = (centres.length * 997) % pixelCount;
    let bestDistance = -1;
    for (let pixel = 0; pixel < pixelCount; pixel += stride) {
      const offset = pixel * 3;
      let nearest = Infinity;
      for (const centre of centres) {
        nearest = Math.min(nearest, colourDistance(pixels[offset], pixels[offset + 1], pixels[offset + 2], centre));
      }
      if (nearest > bestDistance) {
        bestDistance = nearest;
        bestIndex = pixel;
      }
    }
    centres.push(readPixel(pixels, bestIndex));
  }
  return centres;
}

function ensureEveryColourIsUsed(result, pixels) {
  const counts = new Uint32Array(result.colours.length);
  for (const label of result.labels) counts[label] += 1;

  for (let empty = 0; empty < counts.length; empty += 1) {
    if (counts[empty]) continue;
    let candidate = -1;
    let candidateDistance = -1;
    for (let pixel = 0; pixel < result.labels.length; pixel += 1) {
      const donor = result.labels[pixel];
      if (counts[donor] <= 1) continue;
      const offset = pixel * 3;
      const distance = colourDistance(
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
        result.colours[donor],
      );
      if (distance > candidateDistance) {
        candidateDistance = distance;
        candidate = pixel;
      }
    }
    if (candidate < 0) throw new Error("The image does not contain enough distinct colour information.");
    counts[result.labels[candidate]] -= 1;
    result.labels[candidate] = empty;
    counts[empty] = 1;
    result.colours[empty] = readPixel(pixels, candidate);
  }
}

function readPixel(pixels, index) {
  const offset = index * 3;
  return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
}

function colourDistance(red, green, blue, colour) {
  const redMean = (red + colour[0]) / 2;
  const dr = red - colour[0];
  const dg = green - colour[1];
  const db = blue - colour[2];
  return (2 + redMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - redMean) / 256) * db * db;
}

function sortPalette(colours, labels) {
  const order = colours.map((colour, index) => {
    const max = Math.max(...colour);
    const min = Math.min(...colour);
    const lightness = colour[0] * 0.2126 + colour[1] * 0.7152 + colour[2] * 0.0722;
    return { colour, index, lightness, saturation: max - min };
  }).sort((a, b) => a.lightness - b.lightness || b.saturation - a.saturation);

  const remap = new Uint8Array(colours.length);
  order.forEach((item, index) => { remap[item.index] = index; });
  const nextLabels = new Uint8Array(labels.length);
  for (let index = 0; index < labels.length; index += 1) nextLabels[index] = remap[labels[index]];
  return { colours: order.map((item) => item.colour), labels: nextLabels };
}

function findRegions(labels, width, height) {
  const visited = new Uint8Array(labels.length);
  const queue = new Int32Array(labels.length);
  const regions = [];

  for (let start = 0; start < labels.length; start += 1) {
    if (visited[start]) continue;
    const label = labels[start];
    let head = 0;
    let tail = 0;
    let sumX = 0;
    let sumY = 0;
    const cells = [];
    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head++];
      cells.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      sumX += x;
      sumY += y;
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }

    const centreX = sumX / cells.length;
    const centreY = sumY / cells.length;
    let anchor = cells[0];
    let distance = Infinity;
    for (const index of cells) {
      const x = index % width;
      const y = Math.floor(index / width);
      const nextDistance = (x - centreX) ** 2 + (y - centreY) ** 2;
      if (nextDistance < distance) {
        distance = nextDistance;
        anchor = index;
      }
    }
    regions.push({
      label,
      cells,
      anchorX: anchor % width,
      anchorY: Math.floor(anchor / width),
    });

    function visit(index) {
      if (!visited[index] && labels[index] === label) {
        visited[index] = 1;
        queue[tail++] = index;
      }
    }
  }
  return regions;
}

function renderCanvas() {
  if (!state.result) return;
  const { width, height, labels, colours, originalPixels, regions } = state.result;
  const longEdge = 1500;
  const scale = longEdge / Math.max(width, height);
  const canvas = elements.canvas;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  const miniature = document.createElement("canvas");
  miniature.width = width;
  miniature.height = height;
  const miniatureContext = miniature.getContext("2d");
  const image = miniatureContext.createImageData(width, height);

  for (let pixel = 0; pixel < labels.length; pixel += 1) {
    const target = pixel * 4;
    let colour;
    if (state.reference) {
      const source = pixel * 3;
      colour = [originalPixels[source], originalPixels[source + 1], originalPixels[source + 2]];
    } else if (state.filled.has(labels[pixel])) {
      colour = colours[labels[pixel]];
    } else if (state.hint && labels[pixel] === state.selected) {
      colour = [255, 244, 203];
    } else {
      colour = [255, 254, 249];
    }
    image.data[target] = colour[0];
    image.data[target + 1] = colour[1];
    image.data[target + 2] = colour[2];
    image.data[target + 3] = 255;
  }

  miniatureContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(miniature, 0, 0, canvas.width, canvas.height);

  if (!state.reference) {
    drawBoundaries(context, labels, width, height, scale);
    drawNumbers(context, regions, scale, width, height);
  }
  context.strokeStyle = "rgba(29,40,33,.72)";
  context.lineWidth = Math.max(2, scale * 0.15);
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  setZoom(state.zoom);
}

function drawBoundaries(context, labels, width, height, scale) {
  context.beginPath();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (x < width - 1 && labels[index] !== labels[index + 1]) {
        context.moveTo((x + 1) * scale, y * scale);
        context.lineTo((x + 1) * scale, (y + 1) * scale);
      }
      if (y < height - 1 && labels[index] !== labels[index + width]) {
        context.moveTo(x * scale, (y + 1) * scale);
        context.lineTo((x + 1) * scale, (y + 1) * scale);
      }
    }
  }
  context.strokeStyle = "rgba(35,45,39,.42)";
  context.lineWidth = Math.max(0.8, scale * 0.085);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
}

function drawNumbers(context, regions, scale, width, height) {
  const minimumArea = Math.max(9, Math.round((width * height) / 3200));
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";

  for (const region of regions) {
    if (state.filled.has(region.label) || region.cells.length < minimumArea) continue;
    const number = String(region.label + 1);
    const fontSize = Math.max(7.5, Math.min(16, Math.sqrt(region.cells.length) * scale * 0.32));
    const x = (region.anchorX + 0.5) * scale;
    const y = (region.anchorY + 0.5) * scale;
    context.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    context.strokeStyle = "rgba(255,254,249,.96)";
    context.lineWidth = Math.max(2.2, fontSize * 0.3);
    context.strokeText(number, x, y);
    context.fillStyle = region.label === state.selected ? "#a54f36" : "rgba(42,49,44,.82)";
    context.fillText(number, x, y);
  }
}

function renderPalette() {
  elements.paletteGrid.replaceChildren();
  state.result.colours.forEach((colour, index) => {
    const button = document.createElement("button");
    const lightness = relativeLightness(colour);
    button.type = "button";
    button.className = "palette-swatch";
    button.dataset.colour = String(index);
    button.setAttribute("aria-label", `Select colour ${index + 1}, ${toHex(colour)}`);
    button.title = `Colour ${index + 1} · ${toHex(colour)}`;
    button.textContent = String(index + 1);
    button.style.setProperty("--swatch", toHex(colour));
    if (lightness > 0.58) {
      button.style.setProperty("--number-colour", "#273129");
      button.style.setProperty("--number-shadow", "0 1px 1px rgba(255,255,255,.5)");
    }
    button.addEventListener("click", () => selectColour(index));
    elements.paletteGrid.appendChild(button);
  });
  refreshPalette();
}

function selectColour(index) {
  if (!state.result) return;
  state.selected = index;
  state.hint = false;
  elements.hintButton.setAttribute("aria-pressed", "false");
  refreshPalette();
  if (!state.reference) renderCanvas();
  setStatus(state.filled.has(index) ? `Colour ${index + 1} is already complete. Choose an unfinished colour.` : instructionForSelection());
}

function refreshPalette() {
  if (!state.result) return;
  $$(".palette-swatch").forEach((button) => {
    const index = Number(button.dataset.colour);
    button.classList.toggle("is-selected", index === state.selected);
    button.classList.toggle("is-complete", state.filled.has(index));
    button.setAttribute("aria-pressed", String(index === state.selected));
  });
  const colour = state.result.colours[state.selected];
  elements.selectedColour.querySelector("span").style.background = toHex(colour);
  elements.selectedColour.querySelector("strong").textContent = `Colour ${state.selected + 1}`;
}

function handleCanvasClick(event) {
  if (!state.result || state.reference) return;
  const rectangle = elements.canvas.getBoundingClientRect();
  const x = Math.min(state.result.width - 1, Math.max(0, Math.floor(((event.clientX - rectangle.left) / rectangle.width) * state.result.width)));
  const y = Math.min(state.result.height - 1, Math.max(0, Math.floor(((event.clientY - rectangle.top) / rectangle.height) * state.result.height)));
  const clicked = state.result.labels[y * state.result.width + x];

  if (clicked !== state.selected) {
    elements.canvas.classList.remove("is-wrong");
    void elements.canvas.offsetWidth;
    elements.canvas.classList.add("is-wrong");
    setTimeout(() => elements.canvas.classList.remove("is-wrong"), 260);
    setStatus(`That area is number ${clicked + 1}; you have number ${state.selected + 1} selected.`, "error");
    return;
  }
  completeColour(clicked, false);
}

function completeColour(index, keyboardShortcut) {
  if (state.filled.has(index)) {
    setStatus(`Colour ${index + 1} is already complete.`);
    return;
  }

  state.filled.add(index);
  state.hint = false;
  elements.hintButton.setAttribute("aria-pressed", "false");
  saveProgress();
  const completedNumber = index + 1;
  state.selected = firstUnfinished(index + 1);
  refreshPalette();
  renderCanvas();
  updateProgress();

  if (state.filled.size === state.result.colours.length) {
    setStatus(`Masterpiece complete — all ${state.result.colours.length} colours are in place.`, "success");
  } else {
    const shortcutCopy = keyboardShortcut ? " using the keyboard" : "";
    setStatus(`Colour ${completedNumber} complete${shortcutCopy}. Colour ${state.selected + 1} is selected next.`, "success");
  }
}

function selectNextUnfinished(after) {
  if (!state.result) return;
  if (state.filled.size === state.result.colours.length) {
    setStatus("Every colour is complete — your masterpiece is finished.", "success");
    return;
  }
  state.selected = firstUnfinished(after + 1);
  state.hint = false;
  elements.hintButton.setAttribute("aria-pressed", "false");
  refreshPalette();
  if (!state.reference) renderCanvas();
  setStatus(instructionForSelection());
}

function firstUnfinished(start) {
  if (!state.result) return 0;
  const total = state.result.colours.length;
  for (let offset = 0; offset < total; offset += 1) {
    const index = (start + offset) % total;
    if (!state.filled.has(index)) return index;
  }
  return Math.min(state.selected, total - 1);
}

function updateProgress() {
  if (!state.result) return;
  const total = state.result.colours.length;
  const completed = state.filled.size;
  const percent = Math.round((completed / total) * 100);
  elements.progressCount.textContent = `${completed} / ${total} colours`;
  elements.progressFill.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${percent}% complete`;
  updateGalleryProgress();
}

function setZoom(value) {
  state.zoom = Math.max(0.55, Math.min(1.75, Math.round(value * 20) / 20));
  elements.zoomOutput.value = `${Math.round(state.zoom * 100)}%`;
  if (state.result && !elements.canvasScroll.hidden) {
    const availableWidth = Math.max(230, elements.canvasScroll.clientWidth - 76);
    const availableHeight = Math.max(300, elements.canvasScroll.clientHeight - 76);
    const ratio = elements.canvas.width / elements.canvas.height;
    const baseWidth = Math.min(availableWidth, availableHeight * ratio, elements.canvas.width);
    elements.canvas.style.width = `${Math.max(180, baseWidth * state.zoom)}px`;
    elements.canvas.style.height = "auto";
  }
  elements.zoomOut.disabled = state.zoom <= 0.55;
  elements.zoomIn.disabled = state.zoom >= 1.75;
}

function resetPainting() {
  if (!state.result) return;
  const confirmed = window.confirm(`Reset all progress on ${PAINTINGS[state.paintingId].title}?`);
  if (!confirmed) return;
  state.filled.clear();
  state.selected = 0;
  state.reference = false;
  state.hint = false;
  elements.referenceButton.setAttribute("aria-pressed", "false");
  elements.referenceButton.textContent = "Show original";
  elements.hintButton.setAttribute("aria-pressed", "false");
  saveProgress();
  refreshPalette();
  renderCanvas();
  updateProgress();
  setStatus("The canvas has been reset. Colour 1 is ready.");
}

function progressKey(id) {
  return `${STORAGE_PREFIX}${id}`;
}

function loadProgress(id, total) {
  try {
    const stored = JSON.parse(localStorage.getItem(progressKey(id)) || "null");
    if (!stored || !Array.isArray(stored.filled) || stored.total !== total) return new Set();
    return new Set(stored.filled.filter((value) => Number.isInteger(value) && value >= 0 && value < total));
  } catch {
    return new Set();
  }
}

function saveProgress() {
  if (!state.paintingId || !state.result) return;
  try {
    localStorage.setItem(progressKey(state.paintingId), JSON.stringify({
      total: state.result.colours.length,
      filled: [...state.filled].sort((a, b) => a - b),
    }));
  } catch {
    setStatus("Progress could not be saved in this browser, but you can keep painting.", "error");
  }
}

function updateGalleryProgress() {
  Object.keys(PAINTINGS).forEach((id) => {
    const card = document.querySelector(`[data-painting="${id}"]`);
    if (!card) return;
    let completed = 0;
    let total = COLOUR_COUNT;
    try {
      const stored = JSON.parse(localStorage.getItem(progressKey(id)) || "null");
      if (stored && Array.isArray(stored.filled) && Number.isInteger(stored.total)) {
        completed = new Set(stored.filled).size;
        total = stored.total;
      }
    } catch {
      // A malformed local value should not stop the gallery from loading.
    }
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const progress = card.querySelector(".card-progress");
    progress.querySelector("i").style.width = `${percent}%`;
    progress.querySelector("strong").textContent = completed ? `${percent}% complete` : "Not started";
    progress.setAttribute("aria-label", completed ? `${percent}% complete` : "No progress yet");
    const start = card.querySelector(".start-button");
    start.firstChild.textContent = completed ? "Continue painting " : "Start painting ";
  });
}

function instructionForSelection() {
  return `Colour ${state.selected + 1} is selected. Find and click a matching number on the canvas.`;
}

function setStatus(message, tone = "neutral") {
  elements.paintStatus.textContent = message;
  elements.paintStatus.classList.toggle("is-success", tone === "success");
  elements.paintStatus.classList.toggle("is-error", tone === "error");
}

function relativeLightness(colour) {
  const channels = colour.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function toHex(colour) {
  return `#${colour.map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
