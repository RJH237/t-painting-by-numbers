import test from "node:test";
import assert from "node:assert/strict";

import { expandLegacyColours, findRegions } from "../regions.js";

test("same-colour areas receive different IDs when they are not connected", () => {
  const labels = new Uint8Array([
    0, 1, 0, 1,
    0, 1, 0, 1,
    0, 0, 0, 0,
  ]);
  const result = findRegions(labels, 4, 3, 2);

  assert.equal(result.regions.length, 3);
  assert.equal(result.regionsByLabel[1].length, 2);
  assert.equal(result.regionByPixel[1], result.regionByPixel[5]);
  assert.equal(result.regionByPixel[3], result.regionByPixel[7]);
  assert.notEqual(result.regionByPixel[1], result.regionByPixel[3]);
});

test("painting one region leaves a disconnected area with the same number unfinished", () => {
  const labels = new Uint8Array([
    0, 1, 0, 1,
    0, 1, 0, 1,
    0, 0, 0, 0,
  ]);
  const result = findRegions(labels, 4, 3, 2);
  const [left, right] = result.regionsByLabel[1];
  const filled = new Set([left]);

  assert.equal(filled.has(result.regionByPixel[1]), true);
  assert.equal(filled.has(result.regionByPixel[3]), false);
  assert.notEqual(left, right);
});

test("legacy completed colours expand to all of their connected regions", () => {
  const labels = new Uint8Array([
    0, 1, 0, 1,
    0, 1, 0, 1,
    0, 0, 0, 0,
  ]);
  const result = findRegions(labels, 4, 3, 2);
  const migrated = expandLegacyColours([1], result.regions);

  assert.deepEqual([...migrated].sort((a, b) => a - b), [...result.regionsByLabel[1]].sort((a, b) => a - b));
});
