"use strict";

const $ = (selector) => document.querySelector(selector);

const elements = {
  fileInput: $("#file-input"),
  dropZone: $("#drop-zone"),
  sampleButton: $("#sample-button"),
  settings: $("#settings"),
  colourCount: $("#colour-count"),
  colourOutput: $("#colour-output"),
  detailLevel: $("#detail-level"),
  detailOutput: $("#detail-output"),
  createButton: $("#create-button"),
  emptyState: $("#empty-state"),
  processingState: $("#processing-state"),
  processingCopy: $("#processing-copy"),
  canvasScroll: $("#canvas-scroll"),
  canvas: $("#result-canvas"),
  templateTab: $("#template-tab"),
  colourTab: $("#colour-tab"),
  zoomOut: $("#zoom-out"),
  zoomIn: $("#zoom-in"),
  zoomOutput: $("#zoom-output"),
  resultFooter: $("#result-footer"),
  resultTitle: $("#result-title"),
  resultStats: $("#result-stats"),
  printButton: $("#print-button"),
  downloadButton: $("#download-button"),
  paletteSection: $("#palette-section"),
  paletteGrid: $("#palette-grid"),
};

const state = {
  image: null,
  fileName: "painting",
  result: null,
  view: "template",
  zoom: 1,
  busy: false,
};

function updateRange(range, output, formatter = String) {
  const min = Number(range.min);
  const max = Number(range.max);
  const value = Number(range.value);
  range.style.setProperty("--range-fill", `${((value - min) / (max - min)) * 100}%`);
  output.value = formatter(value);
}

function detailName(value) {
  if (value <= 70) return "Bold";
  if (value <= 105) return "Balanced";
  return "Detailed";
}

updateRange(elements.colourCount, elements.colourOutput);
updateRange(elements.detailLevel, elements.detailOutput, detailName);

elements.colourCount.addEventListener("input", () => updateRange(elements.colourCount, elements.colourOutput));
elements.detailLevel.addEventListener("input", () => updateRange(elements.detailLevel, elements.detailOutput, detailName));
elements.createButton.addEventListener("click", createTemplate);
elements.sampleButton.addEventListener("click", loadSampleImage);
elements.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) loadFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
});

elements.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) loadFile(file);
});

elements.templateTab.addEventListener("click", () => setView("template"));
elements.colourTab.addEventListener("click", () => setView("colour"));
elements.zoomOut.addEventListener("click", () => setZoom(state.zoom - 0.15));
elements.zoomIn.addEventListener("click", () => setZoom(state.zoom + 0.15));
elements.printButton.addEventListener("click", () => window.print());
elements.downloadButton.addEventListener("click", downloadResult);

function loadFile(file) {
  if (!file.type.startsWith("image/")) {
    showUploadError("Please choose a JPG, PNG or WebP image.");
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showUploadError("That image is over 20 MB. Please choose a smaller file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => loadImageSource(reader.result, file.name.replace(/\.[^.]+$/, ""));
  reader.onerror = () => showUploadError("We couldn't read that file. Please try another image.");
  reader.readAsDataURL(file);
}

function loadImageSource(source, name) {
  const image = new Image();
  image.onload = () => {
    state.image = image;
    state.fileName = sanitiseFileName(name || "painting");
    resetResult();
    elements.dropZone.classList.add("has-image");
    elements.dropZone.querySelector("strong").textContent = `${state.fileName} is ready`;
    elements.dropZone.querySelector("span:last-child").textContent = `${image.naturalWidth} × ${image.naturalHeight} px · click to replace`;
    elements.settings.setAttribute("aria-disabled", "false");
    [elements.colourCount, elements.detailLevel, elements.createButton].forEach((el) => { el.disabled = false; });
    elements.createButton.focus();
  };
  image.onerror = () => showUploadError("We couldn't open that image. Please try another file.");
  image.src = source;
}

function resetResult() {
  state.result = null;
  state.view = "template";
  state.zoom = 1;
  elements.canvasScroll.hidden = true;
  elements.resultFooter.hidden = true;
  elements.paletteSection.hidden = true;
  elements.emptyState.hidden = false;
  elements.emptyState.querySelector("h2").textContent = "Your photo is ready";
  elements.emptyState.querySelector("p").textContent = "Choose your colours and detail, then create your painting plan.";
  [elements.templateTab, elements.colourTab, elements.zoomOut, elements.zoomIn].forEach((el) => { el.disabled = true; });
}

function showUploadError(message) {
  elements.dropZone.querySelector("strong").textContent = message;
  elements.dropZone.classList.remove("has-image");
}

function loadSampleImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 650;
  const ctx = canvas.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, 0, 650);
  sky.addColorStop(0, "#c9d9cf");
  sky.addColorStop(0.58, "#f1d0ab");
  sky.addColorStop(1, "#d38462");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 900, 650);

  ctx.fillStyle = "#f3c868";
  ctx.beginPath(); ctx.arc(660, 165, 78, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,242,205,.55)";
  ctx.beginPath(); ctx.arc(660, 165, 112, 0, Math.PI * 2); ctx.fill();

  drawMountain(ctx, [[0,430],[160,235],[280,390],[410,190],[565,430]], "#536f62");
  drawMountain(ctx, [[220,440],[510,255],[670,418],[790,288],[900,410],[900,650],[220,650]], "#345747");
  drawMountain(ctx, [[0,485],[150,355],[300,470],[470,345],[650,495],[900,420],[900,650],[0,650]], "#284437");

  ctx.fillStyle = "#b95f44";
  ctx.beginPath(); ctx.moveTo(0, 510); ctx.bezierCurveTo(200, 455, 290, 600, 470, 525); ctx.bezierCurveTo(650, 450, 730, 600, 900, 510); ctx.lineTo(900,650); ctx.lineTo(0,650); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e7b55f";
  for (let x = 40; x < 900; x += 75) {
    const y = 535 + Math.sin(x * 0.025) * 28;
    ctx.beginPath(); ctx.ellipse(x, y, 11, 28, 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#fcf1db";
  ctx.fillRect(90, 433, 118, 83);
  ctx.fillStyle = "#8d4b3c";
  ctx.beginPath(); ctx.moveTo(72,438); ctx.lineTo(149,384); ctx.lineTo(226,438); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#31503f";
  ctx.fillRect(137, 470, 29, 46);
  loadImageSource(canvas.toDataURL("image/jpeg", 0.92), "mountain-sunset");
}

function drawMountain(ctx, points, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.lineTo(points.at(-1)[0], 650);
  ctx.lineTo(points[0][0], 650);
  ctx.closePath();
  ctx.fill();
}

async function createTemplate() {
  if (!state.image || state.busy) return;
  state.busy = true;
  setProcessing(true);
  await nextFrame();

  try {
    elements.processingCopy.textContent = "Finding the important colours";
    await nextFrame();
    const prepared = prepareImage(state.image, Number(elements.detailLevel.value));
    const palette = quantise(prepared.pixels, Number(elements.colourCount.value));

    elements.processingCopy.textContent = "Smoothing small shapes";
    await nextFrame();
    let labels = smoothLabels(palette.labels, prepared.width, prepared.height, 2);
    labels = mergeSmallRegions(labels, prepared.width, prepared.height, palette.colours.length);
    const sorted = sortPalette(palette.colours, labels);

    elements.processingCopy.textContent = "Placing the paint numbers";
    await nextFrame();
    const regions = findRegions(sorted.labels, prepared.width, prepared.height);

    state.result = {
      width: prepared.width,
      height: prepared.height,
      labels: sorted.labels,
      colours: sorted.colours,
      regions,
    };
    state.view = "template";
    state.zoom = 1;
    renderResult();
    renderPalette();
    revealResult();
  } catch (error) {
    console.error(error);
    elements.emptyState.hidden = false;
    elements.emptyState.querySelector("h2").textContent = "That one got away from us";
    elements.emptyState.querySelector("p").textContent = "Please try a different image or lower the detail level.";
  } finally {
    state.busy = false;
    setProcessing(false);
  }
}

function prepareImage(image, targetLongEdge) {
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = ratio >= 1 ? targetLongEdge : Math.max(28, Math.round(targetLongEdge * ratio));
  const height = ratio >= 1 ? Math.max(28, Math.round(targetLongEdge / ratio)) : targetLongEdge;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const pixels = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    const alpha = data[i + 3] / 255;
    pixels[j] = Math.round(data[i] * alpha + 255 * (1 - alpha));
    pixels[j + 1] = Math.round(data[i + 1] * alpha + 255 * (1 - alpha));
    pixels[j + 2] = Math.round(data[i + 2] * alpha + 255 * (1 - alpha));
  }
  return { width, height, pixels };
}

function quantise(pixels, colourCount) {
  const pixelCount = pixels.length / 3;
  const colours = initialiseCentres(pixels, colourCount);
  const labels = new Uint8Array(pixelCount);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const sums = Array.from({ length: colours.length }, () => [0, 0, 0, 0]);
    let changes = 0;

    for (let p = 0; p < pixelCount; p += 1) {
      const offset = p * 3;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      let best = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < colours.length; c += 1) {
        const distance = colourDistance(r, g, b, colours[c]);
        if (distance < bestDistance) { bestDistance = distance; best = c; }
      }
      if (labels[p] !== best) changes += 1;
      labels[p] = best;
      sums[best][0] += r;
      sums[best][1] += g;
      sums[best][2] += b;
      sums[best][3] += 1;
    }

    for (let c = 0; c < colours.length; c += 1) {
      if (sums[c][3]) {
        colours[c] = [
          Math.round(sums[c][0] / sums[c][3]),
          Math.round(sums[c][1] / sums[c][3]),
          Math.round(sums[c][2] / sums[c][3]),
        ];
      }
    }
    if (changes < pixelCount * 0.003) break;
  }
  return { colours, labels };
}

function initialiseCentres(pixels, count) {
  const pixelCount = pixels.length / 3;
  const average = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 3) {
    average[0] += pixels[i]; average[1] += pixels[i + 1]; average[2] += pixels[i + 2];
  }
  average[0] /= pixelCount; average[1] /= pixelCount; average[2] /= pixelCount;

  const centres = [];
  let firstIndex = 0;
  let furthest = -1;
  for (let p = 0; p < pixelCount; p += 1) {
    const i = p * 3;
    const distance = colourDistance(pixels[i], pixels[i + 1], pixels[i + 2], average);
    if (distance > furthest) { furthest = distance; firstIndex = p; }
  }
  centres.push(readPixel(pixels, firstIndex));

  const stride = Math.max(1, Math.floor(pixelCount / 5000));
  while (centres.length < count) {
    let bestIndex = (centres.length * 997) % pixelCount;
    let bestDistance = -1;
    for (let p = 0; p < pixelCount; p += stride) {
      const i = p * 3;
      let nearest = Infinity;
      for (const centre of centres) {
        nearest = Math.min(nearest, colourDistance(pixels[i], pixels[i + 1], pixels[i + 2], centre));
      }
      if (nearest > bestDistance) { bestDistance = nearest; bestIndex = p; }
    }
    centres.push(readPixel(pixels, bestIndex));
  }
  return centres;
}

function readPixel(pixels, index) {
  const offset = index * 3;
  return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
}

function colourDistance(r, g, b, colour) {
  const redMean = (r + colour[0]) / 2;
  const dr = r - colour[0];
  const dg = g - colour[1];
  const db = b - colour[2];
  return (2 + redMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - redMean) / 256) * db * db;
}

function smoothLabels(input, width, height, passes) {
  let labels = input.slice();
  for (let pass = 0; pass < passes; pass += 1) {
    const next = labels.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        const counts = new Map();
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const value = labels[(y + dy) * width + x + dx];
            counts.set(value, (counts.get(value) || 0) + 1);
          }
        }
        let winner = labels[index];
        let winningCount = counts.get(winner) || 0;
        for (const [value, count] of counts) {
          if (count > winningCount) { winner = value; winningCount = count; }
        }
        if (winningCount >= 5) next[index] = winner;
      }
    }
    labels = next;
  }
  return labels;
}

function mergeSmallRegions(input, width, height, colourCount) {
  let labels = input.slice();
  const minimumArea = Math.max(3, Math.round((width * height) / 2800));

  for (let pass = 0; pass < 3; pass += 1) {
    const regions = findRegions(labels, width, height, false);
    let merged = 0;
    for (const region of regions) {
      if (region.cells.length >= minimumArea) continue;
      const neighbourCounts = new Uint16Array(colourCount);
      for (const index of region.cells) {
        const x = index % width;
        const y = Math.floor(index / width);
        if (x > 0 && labels[index - 1] !== region.label) neighbourCounts[labels[index - 1]] += 1;
        if (x < width - 1 && labels[index + 1] !== region.label) neighbourCounts[labels[index + 1]] += 1;
        if (y > 0 && labels[index - width] !== region.label) neighbourCounts[labels[index - width]] += 1;
        if (y < height - 1 && labels[index + width] !== region.label) neighbourCounts[labels[index + width]] += 1;
      }
      let winner = region.label;
      for (let c = 0; c < colourCount; c += 1) if (neighbourCounts[c] > neighbourCounts[winner]) winner = c;
      if (winner !== region.label) {
        for (const index of region.cells) labels[index] = winner;
        merged += 1;
      }
    }
    if (!merged) break;
  }
  return labels;
}

function sortPalette(colours, labels) {
  const order = colours.map((colour, index) => ({
    colour,
    index,
    lightness: colour[0] * 0.2126 + colour[1] * 0.7152 + colour[2] * 0.0722,
  })).sort((a, b) => a.lightness - b.lightness);
  const remap = new Uint8Array(colours.length);
  order.forEach((item, index) => { remap[item.index] = index; });
  const nextLabels = new Uint8Array(labels.length);
  for (let i = 0; i < labels.length; i += 1) nextLabels[i] = remap[labels[i]];
  return { colours: order.map((item) => item.colour), labels: nextLabels };
}

function findRegions(labels, width, height, calculateAnchors = true) {
  const visited = new Uint8Array(labels.length);
  const regions = [];
  const queue = new Int32Array(labels.length);
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
      sumX += x; sumY += y;
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }
    const region = { label, cells };
    if (calculateAnchors) {
      const cx = sumX / cells.length;
      const cy = sumY / cells.length;
      let anchor = cells[0];
      let distance = Infinity;
      for (const index of cells) {
        const x = index % width;
        const y = Math.floor(index / width);
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < distance) { distance = d; anchor = index; }
      }
      region.anchorX = anchor % width;
      region.anchorY = Math.floor(anchor / width);
    }
    regions.push(region);

    function visit(index) {
      if (!visited[index] && labels[index] === label) {
        visited[index] = 1;
        queue[tail++] = index;
      }
    }
  }
  return regions;
}

function renderResult() {
  const { width, height, labels, colours, regions } = state.result;
  const longEdge = 1600;
  const scale = longEdge / Math.max(width, height);
  const canvas = elements.canvas;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.view === "colour" ? rgb(colours[0]) : "#fffefa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.view === "colour") {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        ctx.fillStyle = rgb(colours[labels[y * width + x]]);
        ctx.fillRect(x * scale, y * scale, Math.ceil(scale + 0.35), Math.ceil(scale + 0.35));
      }
    }
  }

  drawBoundaries(ctx, labels, width, height, scale, state.view === "colour");
  if (state.view === "template") drawNumbers(ctx, regions, scale, width, height);
  setZoom(state.zoom);
}

function drawBoundaries(ctx, labels, width, height, scale, onColour) {
  ctx.beginPath();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (x < width - 1 && labels[index] !== labels[index + 1]) {
        ctx.moveTo((x + 1) * scale, y * scale);
        ctx.lineTo((x + 1) * scale, (y + 1) * scale);
      }
      if (y < height - 1 && labels[index] !== labels[index + width]) {
        ctx.moveTo(x * scale, (y + 1) * scale);
        ctx.lineTo((x + 1) * scale, (y + 1) * scale);
      }
    }
  }
  ctx.strokeStyle = onColour ? "rgba(27,36,31,.28)" : "rgba(29,40,33,.72)";
  ctx.lineWidth = onColour ? Math.max(0.75, scale * 0.08) : Math.max(1, scale * 0.11);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.strokeStyle = "rgba(29,40,33,.72)";
  ctx.lineWidth = Math.max(2, scale * 0.14);
  ctx.strokeRect(1, 1, width * scale - 2, height * scale - 2);
}

function drawNumbers(ctx, regions, scale, width, height) {
  const minimumLabelArea = Math.max(5, Math.round((width * height) / 1900));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  for (const region of regions) {
    if (region.cells.length < minimumLabelArea) continue;
    const number = String(region.label + 1);
    const fontSize = Math.max(8, Math.min(18, Math.sqrt(region.cells.length) * scale * 0.42));
    const x = (region.anchorX + 0.5) * scale;
    const y = (region.anchorY + 0.5) * scale;
    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.strokeStyle = "rgba(255,254,250,.96)";
    ctx.lineWidth = Math.max(2.5, fontSize * 0.27);
    ctx.strokeText(number, x, y);
    ctx.fillStyle = "rgba(40,47,42,.82)";
    ctx.fillText(number, x, y);
  }
}

function renderPalette() {
  elements.paletteGrid.replaceChildren();
  state.result.colours.forEach((colour, index) => {
    const card = document.createElement("div");
    card.className = "swatch-card";
    const hex = toHex(colour);
    card.innerHTML = `
      <span class="swatch-colour" style="background:${hex}">${index + 1}</span>
      <span class="swatch-details"><strong>Colour ${index + 1}</strong><code>${hex}</code></span>
    `;
    elements.paletteGrid.appendChild(card);
  });
}

function revealResult() {
  elements.emptyState.hidden = true;
  elements.canvasScroll.hidden = false;
  elements.resultFooter.hidden = false;
  elements.paletteSection.hidden = false;
  [elements.templateTab, elements.colourTab, elements.zoomOut, elements.zoomIn].forEach((el) => { el.disabled = false; });
  elements.resultTitle.textContent = state.view === "template" ? "Your numbered template" : "Your colour guide";
  const numberedRegions = state.result.regions.filter((region) => region.cells.length >= Math.max(5, Math.round((state.result.width * state.result.height) / 1900))).length;
  elements.resultStats.textContent = `${state.result.colours.length} colours · ${numberedRegions} paint areas · ${state.result.width} × ${state.result.height} shape grid`;
  elements.templateTab.classList.add("is-active");
  elements.colourTab.classList.remove("is-active");
  elements.templateTab.setAttribute("aria-selected", "true");
  elements.colourTab.setAttribute("aria-selected", "false");
  setTimeout(() => elements.canvasScroll.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
}

function setProcessing(isProcessing) {
  elements.processingState.hidden = !isProcessing;
  elements.emptyState.hidden = isProcessing || Boolean(state.result);
  elements.canvasScroll.hidden = isProcessing || !state.result;
  elements.createButton.disabled = isProcessing || !state.image;
  elements.createButton.querySelector("span:first-child").textContent = isProcessing ? "Creating…" : "Create my template";
}

function setView(view) {
  if (!state.result || state.view === view) return;
  state.view = view;
  const template = view === "template";
  elements.templateTab.classList.toggle("is-active", template);
  elements.colourTab.classList.toggle("is-active", !template);
  elements.templateTab.setAttribute("aria-selected", String(template));
  elements.colourTab.setAttribute("aria-selected", String(!template));
  elements.resultTitle.textContent = template ? "Your numbered template" : "Your colour guide";
  renderResult();
}

function setZoom(value) {
  state.zoom = Math.max(0.55, Math.min(1.6, Math.round(value * 20) / 20));
  elements.zoomOutput.value = `${Math.round(state.zoom * 100)}%`;
  if (state.result) {
    const available = Math.max(240, elements.canvasScroll.clientWidth - 84);
    const naturalRatio = elements.canvas.width / elements.canvas.height;
    const baseWidth = Math.min(available, elements.canvas.width, (elements.canvasScroll.clientHeight - 84) * naturalRatio);
    elements.canvas.style.width = `${Math.max(180, baseWidth * state.zoom)}px`;
    elements.canvas.style.height = "auto";
  }
  elements.zoomOut.disabled = !state.result || state.zoom <= 0.55;
  elements.zoomIn.disabled = !state.result || state.zoom >= 1.6;
}

function downloadResult() {
  if (!state.result) return;
  const link = document.createElement("a");
  link.download = `${state.fileName}-${state.view === "template" ? "numbered-template" : "colour-guide"}.png`;
  link.href = elements.canvas.toDataURL("image/png");
  link.click();
}

function rgb(colour) { return `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`; }
function toHex(colour) { return `#${colour.map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase(); }
function sanitiseFileName(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "painting"; }
function nextFrame() { return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))); }

window.addEventListener("resize", () => state.result && setZoom(state.zoom));
