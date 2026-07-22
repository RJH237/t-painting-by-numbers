import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBackingStore,
  calculateLabelFontSize,
  findLabelPlacement,
} from "../canvas-rendering.js";

test("uses the screen pixel ratio for a crisp canvas when within safe limits", () => {
  assert.deepEqual(calculateBackingStore(1000, 600, 2), {
    width: 2000,
    height: 1200,
    scaleX: 2,
    scaleY: 2,
  });
});

test("caps very large backing stores without stretching a fixed-resolution canvas", () => {
  const backing = calculateBackingStore(5000, 3000, 2);
  assert.ok(backing.width * backing.height <= 24_010_000);
  assert.ok(backing.scaleX > 1);
  assert.ok(backing.scaleX < 2);
});

test("small labels stay hidden until zoom gives a cell readable space", () => {
  const region = { label: 119, cells: [0] };
  const placement = { widthCells: 1, heightCells: 1 };
  assert.equal(calculateLabelFontSize(region, placement, 6), 0);
  assert.ok(calculateLabelFontSize(region, placement, 30) >= 9);
});

test("label placement favours the best centred clearance inside an irregular region", () => {
  const regionByPixel = new Uint16Array([
    1, 0, 0, 0, 1,
    1, 1, 0, 1, 1,
    1, 0, 0, 0, 1,
  ]);
  const region = { id: 0, label: 7, cells: [1, 2, 3, 7, 11, 12, 13], anchorX: 2, anchorY: 1 };
  const placement = findLabelPlacement(region, regionByPixel, 5, 3);
  assert.equal(placement.x, 2);
  assert.equal(placement.y, 1);
  assert.equal(placement.widthCells, 1);
  assert.equal(placement.heightCells, 3);
});
