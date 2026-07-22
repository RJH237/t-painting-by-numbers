import assert from "node:assert/strict";
import test from "node:test";

import { detectDeviceLayout } from "../device-layout.js";

test("identifies a phone from the browser's mobile device flag", () => {
  assert.equal(detectDeviceLayout({ userAgentMobile: true }), "phone");
});

test("identifies common phone user agents when the mobile flag is unavailable", () => {
  assert.equal(detectDeviceLayout({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }), "phone");
  assert.equal(detectDeviceLayout({ userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit Mobile" }), "phone");
});

test("uses a phone-sized coarse touchscreen as a privacy-friendly fallback", () => {
  assert.equal(detectDeviceLayout({ coarsePointer: true, screenWidth: 430, screenHeight: 932 }), "phone");
});

test("keeps desktop and large touch layouts out of phone mode", () => {
  assert.equal(detectDeviceLayout({ screenWidth: 1440, screenHeight: 900 }), "desktop");
  assert.equal(detectDeviceLayout({ coarsePointer: true, screenWidth: 820, screenHeight: 1180 }), "desktop");
});
