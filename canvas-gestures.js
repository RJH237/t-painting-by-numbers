"use strict";

export function clampZoom(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function wheelZoomTarget(currentZoom, deltaY, deltaMode = 0) {
  const sensitivity = deltaMode === 1 ? 0.04 : deltaMode === 2 ? 0.4 : 0.002;
  return currentZoom * Math.exp(-deltaY * sensitivity);
}

export function distanceBetween(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function midpointBetween(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function canvasAnchorFromPoint(rectangle, point) {
  return {
    x: Math.max(0, Math.min(1, (point.x - rectangle.left) / rectangle.width)),
    y: Math.max(0, Math.min(1, (point.y - rectangle.top) / rectangle.height)),
  };
}

export function scrollDeltaForAnchor(rectangle, anchor, point) {
  return {
    x: rectangle.left + rectangle.width * anchor.x - point.x,
    y: rectangle.top + rectangle.height * anchor.y - point.y,
  };
}
