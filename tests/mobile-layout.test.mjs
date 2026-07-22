import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("phone painting workspace fills the viewport and removes the site header", () => {
  assert.match(css, /body\.paint-page main \{[\s\S]*?height: var\(--app-height, 100dvh\);/);
  assert.match(css, /body\.paint-page \.site-header,[\s\S]*?display: none;/);
});

test("phone palette is a visible single-column vertical scroller", () => {
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 58px;/);
  assert.match(css, /\.palette-grid \{[\s\S]*?flex-direction: column;[\s\S]*?overflow-y: auto;/);
  assert.match(css, /\.palette-swatch \{[\s\S]*?flex: 0 0 42px;/);
});
