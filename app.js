"use strict";

import { COLOUR_COUNT, DETAIL_EDGE, PAINTINGS, progressKey } from "./paintings.js";
import { expandLegacyColours, findRegions } from "./regions.js";
import {
  calculateBackingStore,
  calculateLabelFontSize,
  calculateRequiredZoomForLabels,
  findLabelPlacement,
} from "./canvas-rendering.js";
import {
  canvasAnchorFromPoint,
  clampZoom,
  distanceBetween,
  midpointBetween,
  scrollDeltaForAnchor,
  wheelZoomTarget,
} from "./canvas-gestures.js";

const MIN_ZOOM = 0.5;
const DEFAULT_MAX_ZOOM = 5;
const MAX_SAFE_ZOOM = 12;
const ZOOM_STEP = 0.25;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  studioArtist: $("#studio-artist"),
  studioTitle: $("#studio-title"),
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
  palettePanel: $("#palette-panel"),
  paletteToggle: $("#palette-toggle"),
  paletteClose: $("#palette-close"),
  paletteBackdrop: $("#palette-backdrop"),
  mobileColourLabel: $("#mobile-colour-label"),
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
  paletteOpen: false,
  loadToken: 0,
};

const gesture = {
  pointers: new Map(),
  panStart: null,
  pinchStart: null,
  pendingZoom: null,
  zoomFrame: 0,
  suppressClickUntil: 0,
  wheelZoom: null,
  wheelFrame: 0,
};

elements.referenceButton.addEventListener("click", () => {
  if (!state.result) return;
  state.reference = !state.reference;
  elements.referenceButton.setAttribute("aria-pressed", String(state.reference));
  syncControlLabels();
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

elements.zoomOut.addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));
elements.zoomIn.addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
elements.nextButton.addEventListener("click", () => {
  selectNextUnfinished(state.selected);
  if (usesPaletteDrawer()) closePaletteAndFocusCanvas();
});
elements.resetButton.addEventListener("click", resetPainting);
elements.paletteToggle.addEventListener("click", () => setPaletteOpen(!state.paletteOpen));
elements.paletteClose.addEventListener("click", () => setPaletteOpen(false, true));
elements.paletteBackdrop.addEventListener("click", () => setPaletteOpen(false, true));
elements.canvas.addEventListener("click", handleCanvasClick);
elements.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
elements.canvasScroll.addEventListener("pointerdown", handleCanvasPointerDown);
elements.canvasScroll.addEventListener("pointermove", handleCanvasPointerMove);
elements.canvasScroll.addEventListener("pointerup", handleCanvasPointerEnd);
elements.canvasScroll.addEventListener("pointercancel", handleCanvasPointerEnd);
elements.canvas.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && state.result && !state.reference) {
    event.preventDefault();
    completeNextRegionForColour(state.selected, true);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.paletteOpen) setPaletteOpen(false, true);
});
let resizeFrame = 0;
window.addEventListener("resize", () => {
  if (!state.result) return;
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(renderCanvas);
});
window.addEventListener("painted:layoutchange", () => {
  setPaletteOpen(false);
  syncControlLabels();
  if (state.result) requestAnimationFrame(renderCanvas);
});
syncDeviceControls();

const requestedPainting = new URLSearchParams(window.location.search).get("id");
const initialPainting = Object.hasOwn(PAINTINGS, requestedPainting) ? requestedPainting : Object.keys(PAINTINGS)[0];
if (requestedPainting !== initialPainting) {
  const url = new URL(window.location.href);
  url.searchParams.set("id", initialPainting);
  window.history.replaceState({}, "", url);
}
openPainting(initialPainting);

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
  setPaletteOpen(false);

  elements.studioArtist.textContent = `${painting.artist} · ${painting.year}`;
  elements.studioTitle.textContent = painting.title;
  document.title = `${painting.title} — Painted`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = `Paint ${painting.title} online with ${COLOUR_COUNT} numbered colours.`;
  elements.loadingState.hidden = false;
  elements.canvasScroll.hidden = true;
  elements.paletteGrid.replaceChildren();
  elements.referenceButton.setAttribute("aria-pressed", "false");
  elements.hintButton.setAttribute("aria-pressed", "false");
  syncControlLabels();
  elements.progressCount.textContent = "0 areas painted";
  elements.progressFill.style.width = "0%";
  elements.progressPercent.textContent = "0% complete";
  elements.loadingCopy.textContent = "Studying the colours in the original";
  setStatus("Preparing the numbered canvas…");

  try {
    const image = await loadImage(painting.image);
    if (token !== state.loadToken) return;

    elements.loadingCopy.textContent = "Mixing 120 numbered colours";
    await nextFrame();
    const prepared = prepareImage(image, DETAIL_EDGE);
    const quantised = quantise(prepared.pixels, COLOUR_COUNT);
    quantised.labels = smoothLabels(quantised.labels, prepared.width, prepared.height, 2);
    ensureEveryColourIsUsed(quantised, prepared.pixels);
    recalculateColours(quantised, prepared.pixels);

    elements.loadingCopy.textContent = "Drawing the numbered regions";
    await nextFrame();
    const sorted = sortPalette(quantised.colours, quantised.labels);
    const regionMap = findRegions(sorted.labels, prepared.width, prepared.height, sorted.colours.length);
    for (const region of regionMap.regions) {
      region.labelPlacement = findLabelPlacement(
        region,
        regionMap.regionByPixel,
        prepared.width,
        prepared.height,
      );
    }

    state.result = {
      width: prepared.width,
      height: prepared.height,
      originalPixels: prepared.pixels,
      labels: sorted.labels,
      colours: sorted.colours,
      ...regionMap,
    };
    state.filled = loadProgress(id, state.result);
    saveProgress();
    state.selected = firstUnfinished(0);
    elements.loadingState.hidden = true;
    elements.canvasScroll.hidden = false;
    renderPalette();
    renderCanvas();
    updateProgress();
    setStatus(
      state.filled.size === state.result.regions.length
        ? "Masterpiece complete — every connected area is painted."
        : instructionForSelection(),
      state.filled.size === state.result.regions.length ? "success" : "neutral",
    );
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

function smoothLabels(input, width, height, passes) {
  let labels = input.slice();
  for (let pass = 0; pass < passes; pass += 1) {
    const next = labels.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        const counts = new Uint8Array(COLOUR_COUNT);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx || dy) counts[labels[(y + dy) * width + x + dx]] += 1;
          }
        }
        let winner = labels[index];
        let winningCount = counts[winner];
        for (let colour = 0; colour < counts.length; colour += 1) {
          if (counts[colour] > winningCount) {
            winner = colour;
            winningCount = counts[colour];
          }
        }
        if (winningCount >= 5) next[index] = winner;
      }
    }
    labels = next;
  }
  return labels;
}

function recalculateColours(result, pixels) {
  const sums = Array.from({ length: result.colours.length }, () => [0, 0, 0, 0]);
  for (let pixel = 0; pixel < result.labels.length; pixel += 1) {
    const label = result.labels[pixel];
    const offset = pixel * 3;
    sums[label][0] += pixels[offset];
    sums[label][1] += pixels[offset + 1];
    sums[label][2] += pixels[offset + 2];
    sums[label][3] += 1;
  }
  result.colours = sums.map((sum, index) => sum[3] ? [
    Math.round(sum[0] / sum[3]),
    Math.round(sum[1] / sum[3]),
    Math.round(sum[2] / sum[3]),
  ] : result.colours[index]);
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

function renderCanvas() {
  if (!state.result) return;
  const { width, height, labels, colours, originalPixels, regions, regionByPixel } = state.result;
  const canvas = elements.canvas;
  const displayWidth = Math.max(180, getCanvasBaseWidth() * state.zoom);
  const displayHeight = displayWidth * (height / width);
  const backing = calculateBackingStore(displayWidth, displayHeight, window.devicePixelRatio);
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  if (canvas.width !== backing.width) canvas.width = backing.width;
  if (canvas.height !== backing.height) canvas.height = backing.height;
  const context = canvas.getContext("2d");
  context.setTransform(backing.scaleX, 0, 0, backing.scaleY, 0, 0);
  context.clearRect(0, 0, displayWidth, displayHeight);

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
    } else if (state.filled.has(regionByPixel[pixel])) {
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
  context.drawImage(miniature, 0, 0, displayWidth, displayHeight);

  if (!state.reference) {
    const cellScale = displayWidth / width;
    drawBoundaries(context, labels, width, height, cellScale);
    drawNumbers(context, regions, cellScale);
  }
  context.strokeStyle = "rgba(29,40,33,.72)";
  context.lineWidth = Math.max(1.5, (displayWidth / width) * 0.15);
  context.strokeRect(1, 1, displayWidth - 2, displayHeight - 2);
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

function drawNumbers(context, regions, scale) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";

  for (const region of regions) {
    if (state.filled.has(region.id)) continue;
    const number = String(region.label + 1);
    const placement = region.labelPlacement;
    let fontSize = calculateLabelFontSize(region, placement, scale);
    if (!fontSize) continue;
    const x = (placement.x + 0.5) * scale;
    const y = (placement.y + 0.5) * scale;
    context.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    const availableWidth = placement.widthCells * scale * 0.9;
    const measuredWidth = context.measureText(number).width;
    if (measuredWidth > availableWidth) {
      fontSize *= availableWidth / measuredWidth;
      if (fontSize < 9) continue;
      context.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    }
    context.strokeStyle = "rgba(255,254,249,.96)";
    context.lineWidth = Math.max(1, fontSize * 0.16);
    context.strokeText(number, x, y);
    context.fillStyle = region.label === state.selected ? "#9b422b" : "rgba(35,43,37,.92)";
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
  setStatus(isColourComplete(index) ? `Colour ${index + 1} is already complete. Choose an unfinished colour.` : instructionForSelection());
  if (usesPaletteDrawer()) closePaletteAndFocusCanvas();
}

function refreshPalette() {
  if (!state.result) return;
  $$(".palette-swatch").forEach((button) => {
    const index = Number(button.dataset.colour);
    button.classList.toggle("is-selected", index === state.selected);
    button.classList.toggle("is-complete", isColourComplete(index));
    button.setAttribute("aria-pressed", String(index === state.selected));
  });
  const colour = state.result.colours[state.selected];
  elements.selectedColour.querySelector("span").style.background = toHex(colour);
  elements.selectedColour.querySelector("strong").textContent = `Colour ${state.selected + 1}`;
  elements.paletteToggle.style.setProperty("--mobile-swatch", toHex(colour));
  elements.mobileColourLabel.textContent = `Colour ${state.selected + 1}`;
}

function handleCanvasClick(event) {
  if (performance.now() < gesture.suppressClickUntil) return;
  if (!state.result || state.reference) return;
  const rectangle = elements.canvas.getBoundingClientRect();
  const x = Math.min(state.result.width - 1, Math.max(0, Math.floor(((event.clientX - rectangle.left) / rectangle.width) * state.result.width)));
  const y = Math.min(state.result.height - 1, Math.max(0, Math.floor(((event.clientY - rectangle.top) / rectangle.height) * state.result.height)));
  const pixel = y * state.result.width + x;
  const clicked = state.result.labels[pixel];
  const regionId = state.result.regionByPixel[pixel];

  if (clicked !== state.selected) {
    elements.canvas.classList.remove("is-wrong");
    void elements.canvas.offsetWidth;
    elements.canvas.classList.add("is-wrong");
    setTimeout(() => elements.canvas.classList.remove("is-wrong"), 260);
    setStatus(`That area is number ${clicked + 1}; you have number ${state.selected + 1} selected.`, "error");
    return;
  }
  completeRegion(regionId, false);
}

function completeRegion(regionId, keyboardShortcut) {
  const region = state.result.regions[regionId];
  if (state.filled.has(regionId)) {
    setStatus(`This number ${region.label + 1} area is already painted.`);
    return;
  }

  state.filled.add(regionId);
  state.hint = false;
  elements.hintButton.setAttribute("aria-pressed", "false");
  saveProgress();
  const completedNumber = region.label + 1;
  const remainingForColour = unfinishedRegionsForColour(region.label).length;
  if (!remainingForColour) state.selected = firstUnfinished(region.label + 1);
  refreshPalette();
  renderCanvas();
  updateProgress();

  if (state.filled.size === state.result.regions.length) {
    setStatus(`Masterpiece complete — all ${state.result.regions.length} connected areas are painted.`, "success");
  } else if (remainingForColour) {
    const shortcutCopy = keyboardShortcut ? " using the keyboard" : "";
    const areaCopy = remainingForColour === 1 ? "area remains" : "areas remain";
    setStatus(`One number ${completedNumber} area painted${shortcutCopy}. ${remainingForColour} matching ${areaCopy}.`, "success");
  } else {
    const shortcutCopy = keyboardShortcut ? " using the keyboard" : "";
    setStatus(`Colour ${completedNumber} complete${shortcutCopy}. Colour ${state.selected + 1} is selected next.`, "success");
  }
}

function completeNextRegionForColour(colour, keyboardShortcut) {
  const [regionId] = unfinishedRegionsForColour(colour);
  if (regionId === undefined) {
    setStatus(`Colour ${colour + 1} is already complete. Choose an unfinished colour.`);
    return;
  }
  completeRegion(regionId, keyboardShortcut);
}

function selectNextUnfinished(after) {
  if (!state.result) return;
  if (state.filled.size === state.result.regions.length) {
    setStatus("Every connected area is complete — your masterpiece is finished.", "success");
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
    if (!isColourComplete(index)) return index;
  }
  return Math.min(state.selected, total - 1);
}

function unfinishedRegionsForColour(colour) {
  if (!state.result) return [];
  return state.result.regionsByLabel[colour].filter((regionId) => !state.filled.has(regionId));
}

function isColourComplete(colour) {
  return state.result ? unfinishedRegionsForColour(colour).length === 0 : false;
}

function updateProgress() {
  if (!state.result) return;
  const total = state.result.regions.length;
  const completed = state.filled.size;
  const percent = Math.round((completed / total) * 100);
  elements.progressCount.textContent = `${completed} / ${total} areas`;
  elements.progressFill.style.width = `${percent}%`;
  elements.progressPercent.textContent = `${percent}% complete`;
}

function setZoom(value, { snap = true, anchor = null, point = null } = {}) {
  const maximumZoom = getMaximumZoom();
  const nextValue = snap ? Math.round(value / ZOOM_STEP) * ZOOM_STEP : value;
  const nextZoom = clampZoom(nextValue, MIN_ZOOM, maximumZoom);
  const zoomChanged = Math.abs(nextZoom - state.zoom) > 0.001;
  state.zoom = nextZoom;
  elements.zoomOutput.value = `${Math.round(state.zoom * 100)}%`;
  if (zoomChanged && state.result && !elements.canvasScroll.hidden) {
    renderCanvas();
  }
  if (anchor && point && state.result && !elements.canvasScroll.hidden) {
    positionCanvasAnchor(anchor, point);
  }
  elements.zoomOut.disabled = state.zoom <= MIN_ZOOM;
  elements.zoomIn.disabled = state.zoom >= maximumZoom;
}

function getMaximumZoom() {
  if (!state.result) return DEFAULT_MAX_ZOOM;
  const baseCellScale = getCanvasBaseWidth() / state.result.width;
  const required = calculateRequiredZoomForLabels(state.result.regions, baseCellScale);
  return Math.min(MAX_SAFE_ZOOM, Math.max(DEFAULT_MAX_ZOOM, Math.ceil(required / ZOOM_STEP) * ZOOM_STEP));
}

function captureCanvasAnchor(point) {
  return canvasAnchorFromPoint(elements.canvas.getBoundingClientRect(), point);
}

function positionCanvasAnchor(anchor, point) {
  const delta = scrollDeltaForAnchor(elements.canvas.getBoundingClientRect(), anchor, point);
  elements.canvasScroll.scrollLeft += delta.x;
  elements.canvasScroll.scrollTop += delta.y;
}

function handleCanvasWheel(event) {
  if (isPhoneLayout() || !state.result) return;
  event.preventDefault();
  const point = { x: event.clientX, y: event.clientY };
  const currentZoom = gesture.wheelZoom ?? state.zoom;
  gesture.wheelZoom = clampZoom(
    wheelZoomTarget(currentZoom, event.deltaY, event.deltaMode),
    MIN_ZOOM,
    getMaximumZoom(),
  );
  gesture.pendingZoom = {
    value: gesture.wheelZoom,
    anchor: captureCanvasAnchor(point),
    point,
  };
  if (gesture.wheelFrame) return;
  gesture.wheelFrame = requestAnimationFrame(() => {
    gesture.wheelFrame = 0;
    const pending = gesture.pendingZoom;
    gesture.pendingZoom = null;
    gesture.wheelZoom = null;
    if (pending) setZoom(pending.value, { snap: false, anchor: pending.anchor, point: pending.point });
  });
}

function handleCanvasPointerDown(event) {
  if (!isPhoneLayout() || event.pointerType !== "touch" || !state.result) return;
  const captureTarget = event.target instanceof Element ? event.target : elements.canvasScroll;
  captureTarget.setPointerCapture?.(event.pointerId);
  gesture.pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    captureTarget,
  });

  if (gesture.pointers.size === 1) {
    gesture.panStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: elements.canvasScroll.scrollLeft,
      scrollTop: elements.canvasScroll.scrollTop,
    };
    gesture.pinchStart = null;
    return;
  }

  if (gesture.pointers.size === 2) {
    beginPinchGesture();
    gesture.suppressClickUntil = performance.now() + 400;
    event.preventDefault();
  }
}

function handleCanvasPointerMove(event) {
  const activePointer = gesture.pointers.get(event.pointerId);
  if (!activePointer) return;
  gesture.pointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    captureTarget: activePointer.captureTarget,
  });

  if (gesture.pointers.size >= 2) {
    if (!gesture.pinchStart) beginPinchGesture();
    const [first, second] = [...gesture.pointers.values()];
    const distance = distanceBetween(first, second);
    if (!gesture.pinchStart || !distance) return;
    const point = midpointBetween(first, second);
    queueGestureZoom(
      gesture.pinchStart.zoom * (distance / gesture.pinchStart.distance),
      gesture.pinchStart.anchor,
      point,
    );
    gesture.suppressClickUntil = performance.now() + 400;
    event.preventDefault();
    return;
  }

  if (!gesture.panStart || gesture.panStart.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - gesture.panStart.x;
  const deltaY = event.clientY - gesture.panStart.y;
  if (Math.hypot(deltaX, deltaY) > 4) {
    gesture.suppressClickUntil = performance.now() + 400;
  }
  elements.canvasScroll.scrollLeft = gesture.panStart.scrollLeft - deltaX;
  elements.canvasScroll.scrollTop = gesture.panStart.scrollTop - deltaY;
  event.preventDefault();
}

function handleCanvasPointerEnd(event) {
  if (!gesture.pointers.has(event.pointerId)) return;
  gesture.pointers.delete(event.pointerId);
  gesture.pinchStart = null;

  const [remaining] = gesture.pointers.entries();
  if (remaining) {
    const [pointerId, point] = remaining;
    gesture.panStart = {
      pointerId,
      x: point.x,
      y: point.y,
      scrollLeft: elements.canvasScroll.scrollLeft,
      scrollTop: elements.canvasScroll.scrollTop,
    };
  } else {
    gesture.panStart = null;
  }
}

function beginPinchGesture() {
  const [first, second] = [...gesture.pointers.values()];
  if (!first || !second) return;
  const point = midpointBetween(first, second);
  gesture.pinchStart = {
    distance: Math.max(1, distanceBetween(first, second)),
    zoom: state.zoom,
    anchor: captureCanvasAnchor(point),
  };
  gesture.panStart = null;
}

function queueGestureZoom(value, anchor, point) {
  gesture.pendingZoom = {
    value: clampZoom(value, MIN_ZOOM, getMaximumZoom()),
    anchor,
    point,
  };
  if (gesture.zoomFrame) return;
  gesture.zoomFrame = requestAnimationFrame(() => {
    gesture.zoomFrame = 0;
    const pending = gesture.pendingZoom;
    gesture.pendingZoom = null;
    if (pending) setZoom(pending.value, { snap: false, anchor: pending.anchor, point: pending.point });
  });
}

function getCanvasBaseWidth() {
  const canvasGutter = isPhoneLayout() ? 28 : 76;
  const availableWidth = Math.max(230, elements.canvasScroll.clientWidth - canvasGutter);
  const availableHeight = Math.max(240, elements.canvasScroll.clientHeight - canvasGutter);
  const ratio = state.result.width / state.result.height;
  return Math.min(availableWidth, availableHeight * ratio, 1500);
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
  elements.hintButton.setAttribute("aria-pressed", "false");
  syncControlLabels();
  saveProgress();
  refreshPalette();
  renderCanvas();
  updateProgress();
  setStatus("The canvas has been reset. Colour 1 is ready.");
}

function loadProgress(id, result) {
  try {
    const stored = JSON.parse(localStorage.getItem(progressKey(id)) || "null");
    if (!stored) return new Set();
    if (stored.version === 2 && Array.isArray(stored.filledRegions) && stored.totalRegions === result.regions.length) {
      return new Set(stored.filledRegions.filter((value) => Number.isInteger(value) && value >= 0 && value < result.regions.length));
    }
    if (Array.isArray(stored.filled) && stored.total === result.colours.length) {
      const legacyColours = stored.filled.filter((value) => Number.isInteger(value) && value >= 0 && value < result.colours.length);
      return expandLegacyColours(legacyColours, result.regions);
    }
    return new Set();
  } catch {
    return new Set();
  }
}

function saveProgress() {
  if (!state.paintingId || !state.result) return;
  try {
    localStorage.setItem(progressKey(state.paintingId), JSON.stringify({
      version: 2,
      totalRegions: state.result.regions.length,
      filledRegions: [...state.filled].sort((a, b) => a - b),
    }));
  } catch {
    setStatus("Progress could not be saved in this browser, but you can keep painting.", "error");
  }
}

function instructionForSelection() {
  const remaining = unfinishedRegionsForColour(state.selected).length;
  const areaCopy = remaining === 1 ? "area" : "areas";
  return `Colour ${state.selected + 1} is selected. Find and click one of ${remaining} matching ${areaCopy}.`;
}

function setStatus(message, tone = "neutral") {
  elements.paintStatus.textContent = message;
  elements.paintStatus.classList.toggle("is-success", tone === "success");
  elements.paintStatus.classList.toggle("is-error", tone === "error");
}

function isPhoneLayout() {
  return document.documentElement.dataset.device === "phone";
}

function usesPaletteDrawer() {
  return false;
}

function syncDeviceControls() {
  elements.palettePanel.inert = false;
  elements.palettePanel.removeAttribute("role");
  elements.palettePanel.removeAttribute("aria-modal");
  elements.palettePanel.removeAttribute("aria-label");
  syncControlLabels();
}

function syncControlLabels() {
  const phone = isPhoneLayout();
  elements.referenceButton.textContent = state.reference
    ? (phone ? "Canvas" : "Return to canvas")
    : (phone ? "Original" : "Show original");
  elements.hintButton.textContent = phone ? "Hint" : "Highlight number";
}

function setPaletteOpen(open, restoreFocus = false) {
  const next = Boolean(open && usesPaletteDrawer());
  state.paletteOpen = next;
  elements.palettePanel.classList.toggle("is-open", next);
  elements.paletteToggle.setAttribute("aria-expanded", String(next));
  elements.paletteBackdrop.hidden = !next;
  syncDeviceControls();

  if (next) {
    requestAnimationFrame(() => elements.paletteClose.focus());
  } else if (restoreFocus && isPhoneLayout()) {
    elements.paletteToggle.focus();
  }
}

function closePaletteAndFocusCanvas() {
  setPaletteOpen(false);
  requestAnimationFrame(() => elements.canvas.focus({ preventScroll: true }));
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
