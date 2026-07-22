"use strict";

export const MIN_VISIBLE_LABEL_SIZE = 9;
export const MAX_VISIBLE_LABEL_SIZE = 30;

const MAX_BACKING_DIMENSION = 8192;
const MAX_BACKING_PIXELS = 24_000_000;

export function calculateBackingStore(displayWidth, displayHeight, requestedPixelRatio = 1) {
  const width = Math.max(1, displayWidth);
  const height = Math.max(1, displayHeight);
  const safeRequestedRatio = Math.max(1, requestedPixelRatio || 1);
  const dimensionLimit = Math.min(MAX_BACKING_DIMENSION / width, MAX_BACKING_DIMENSION / height);
  const pixelLimit = Math.sqrt(MAX_BACKING_PIXELS / (width * height));
  const pixelRatio = Math.max(0.1, Math.min(safeRequestedRatio, dimensionLimit, pixelLimit));
  const backingWidth = Math.max(1, Math.round(width * pixelRatio));
  const backingHeight = Math.max(1, Math.round(height * pixelRatio));

  return {
    width: backingWidth,
    height: backingHeight,
    scaleX: backingWidth / width,
    scaleY: backingHeight / height,
  };
}

export function findLabelPlacement(region, regionByPixel, width, height) {
  let best = {
    x: region.anchorX,
    y: region.anchorY,
    widthCells: 1,
    heightCells: 1,
    score: 0,
  };
  const digitWidth = String(region.label + 1).length * 0.62;

  for (const cell of region.cells) {
    const x = cell % width;
    const y = Math.floor(cell / width);
    let left = x;
    let right = x;
    let top = y;
    let bottom = y;

    while (left > 0 && regionByPixel[y * width + left - 1] === region.id) left -= 1;
    while (right < width - 1 && regionByPixel[y * width + right + 1] === region.id) right += 1;
    while (top > 0 && regionByPixel[(top - 1) * width + x] === region.id) top -= 1;
    while (bottom < height - 1 && regionByPixel[(bottom + 1) * width + x] === region.id) bottom += 1;

    const widthCells = Math.min(x - left, right - x) * 2 + 1;
    const heightCells = Math.min(y - top, bottom - y) * 2 + 1;
    const score = Math.min(widthCells / digitWidth, heightCells * 0.74);
    if (score > best.score) best = { x, y, widthCells, heightCells, score };
  }

  return best;
}

export function calculateLabelFontSize(region, placement, cellScale) {
  const numberLength = String(region.label + 1).length;
  const areaSize = Math.sqrt(region.cells.length) * cellScale * 0.5;
  const horizontalFit = (placement.widthCells * cellScale * 0.9) / (numberLength * 0.62);
  const verticalFit = placement.heightCells * cellScale * 0.74;
  const fontSize = Math.min(MAX_VISIBLE_LABEL_SIZE, areaSize, horizontalFit, verticalFit);
  return fontSize >= MIN_VISIBLE_LABEL_SIZE ? fontSize : 0;
}

export function calculateRequiredZoomForLabels(regions, baseCellScale, minimumFontSize = MIN_VISIBLE_LABEL_SIZE) {
  if (!regions.length || !(baseCellScale > 0)) return 1;

  let requiredCellScale = 0;
  for (const region of regions) {
    const placement = region.labelPlacement;
    const numberLength = String(region.label + 1).length;
    const areaRequirement = (minimumFontSize * 2) / Math.sqrt(region.cells.length);
    // The extra width allowance covers differences between the approximation and
    // the browser's measured bold system font, including three-digit labels.
    const horizontalRequirement = (minimumFontSize * numberLength * 0.62 * 1.4)
      / (placement.widthCells * 0.9);
    const verticalRequirement = minimumFontSize / (placement.heightCells * 0.74);
    requiredCellScale = Math.max(
      requiredCellScale,
      areaRequirement,
      horizontalRequirement,
      verticalRequirement,
    );
  }

  return requiredCellScale / baseCellScale;
}
