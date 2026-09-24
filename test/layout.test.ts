import test from "node:test";
import assert from "node:assert/strict";
import { clampBounds, restoreLayouts } from "../src/domain/layout.js";
import { createContainer } from "../src/domain/defaults.js";
import type { MonitorSnapshot } from "../src/domain/types.js";

const primary: MonitorSnapshot = {
  id: "primary", name: "Primary", x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1, primary: true,
};

test("clampBounds keeps a container reachable", () => {
  assert.deepEqual(clampBounds({ x: -500, y: 1200, width: 3000, height: 50 }, primary), {
    x: 0, y: 900, width: 1920, height: 180,
  });
});

test("restoreLayouts preserves relative placement after resolution change", () => {
  const container = createContainer("Work", 0, {
    monitorId: "primary",
    bounds: { x: 960, y: 540, width: 480, height: 270 },
  });
  const target = { ...primary, width: 1280, height: 720 };
  const restored = restoreLayouts([container], [primary], [target])[0];
  assert.deepEqual(restored.bounds, { x: 640, y: 360, width: 320, height: 180 });
});

test("restoreLayouts moves containers from a disconnected monitor to primary", () => {
  const secondary = { ...primary, id: "secondary", x: -1280, width: 1280, primary: false };
  const container = createContainer("Work", 0, {
    monitorId: "secondary",
    bounds: { x: 100, y: 100, width: 320, height: 240 },
  });
  const restored = restoreLayouts([container], [secondary], [primary])[0];
  assert.equal(restored.monitorId, "primary");
  assert.equal(restored.bounds.x, 150);
  assert.equal(restored.bounds.y, 100);
});
