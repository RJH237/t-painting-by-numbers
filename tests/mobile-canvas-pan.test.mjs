import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, paintPage, mobilePanCss] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../paint.html", import.meta.url), "utf8"),
  readFile(new URL("../mobile-canvas-pan.css", import.meta.url), "utf8"),
]);

test("phone canvas keeps pinch zoom and one-finger two-axis panning", () => {
  assert.match(app, /beginPinchGesture\(\)/);
  assert.match(app, /scrollLeft\s*=\s*gesture\.panStart\.scrollLeft\s*-\s*deltaX/);
  assert.match(app, /scrollTop\s*=\s*gesture\.panStart\.scrollTop\s*-\s*deltaY/);
  assert.match(app, /event\.preventDefault\(\)/);
});

test("mobile canvas container is independently scrollable on both axes", () => {
  assert.match(mobilePanCss, /overflow-x:\s*auto/);
  assert.match(mobilePanCss, /overflow-y:\s*auto/);
  assert.match(mobilePanCss, /touch-action:\s*none/);
  assert.match(mobilePanCss, /display:\s*block/);
  assert.match(mobilePanCss, /#paint-canvas[\s\S]*margin:\s*0 auto/);
});

test("painting page always loads the mobile interaction regression fix", () => {
  assert.match(paintPage, /href="mobile-canvas-pan\.css"/);
});
