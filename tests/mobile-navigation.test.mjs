import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [app, paintPage, mobileNavigationCss] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../paint.html", import.meta.url), "utf8"),
  readFile(new URL("../mobile-canvas-navigation.css", import.meta.url), "utf8"),
]);

test("phone detection remains an ES module so custom touch gestures are installed", () => {
  assert.match(paintPage, /<script type="module" src="device-layout\.js"><\/script>/);
  assert.doesNotMatch(paintPage, /<script src="device-layout\.js"><\/script>/);
});

test("phone pinch zoom redraws the canvas and its number labels", () => {
  assert.match(app, /queueGestureZoom\(/);
  assert.match(app, /if \(zoomChanged[\s\S]*renderCanvas\(\)/);
  assert.match(app, /const cellScale = displayWidth \/ width;[\s\S]*drawNumbers\(context, regions, cellScale\)/);
});

test("one-finger phone dragging updates both scroll axes", () => {
  assert.match(app, /scrollLeft\s*=\s*gesture\.panStart\.scrollLeft\s*-\s*deltaX/);
  assert.match(app, /scrollTop\s*=\s*gesture\.panStart\.scrollTop\s*-\s*deltaY/);
});

test("the phone canvas exposes independent horizontal and vertical overflow", () => {
  assert.match(mobileNavigationCss, /display:\s*block/);
  assert.match(mobileNavigationCss, /overflow-x:\s*auto/);
  assert.match(mobileNavigationCss, /overflow-y:\s*auto/);
  assert.match(mobileNavigationCss, /touch-action:\s*none/);
  assert.match(paintPage, /href="mobile-canvas-navigation\.css"/);
});
