import assert from "node:assert/strict";
import test from "node:test";

import {
  canvasAnchorFromPoint,
  clampZoom,
  distanceBetween,
  midpointBetween,
  scrollDeltaForAnchor,
  wheelZoomTarget,
} from "../canvas-gestures.js";

test("wheel movement zooms in when scrolling up and out when scrolling down", () => {
  assert.ok(wheelZoomTarget(1, -100) > 1);
  assert.ok(wheelZoomTarget(1, 100) < 1);
});

test("pinch geometry measures distance and midpoint", () => {
  const first = { x: 10, y: 20 };
  const second = { x: 40, y: 60 };
  assert.equal(distanceBetween(first, second), 50);
  assert.deepEqual(midpointBetween(first, second), { x: 25, y: 40 });
});

test("zoom stays within the existing 50 to 500 percent range", () => {
  assert.equal(clampZoom(0.1, 0.5, 5), 0.5);
  assert.equal(clampZoom(7, 0.5, 5), 5);
  assert.equal(clampZoom(2.25, 0.5, 5), 2.25);
});

test("a focal point keeps the same canvas location beneath the gesture", () => {
  const initial = { left: 100, top: 50, width: 400, height: 200 };
  const point = { x: 300, y: 100 };
  const anchor = canvasAnchorFromPoint(initial, point);
  assert.deepEqual(anchor, { x: 0.5, y: 0.25 });

  const enlarged = { left: 100, top: 50, width: 800, height: 400 };
  assert.deepEqual(scrollDeltaForAnchor(enlarged, anchor, point), { x: 200, y: 50 });
});
