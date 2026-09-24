import test from "node:test";
import assert from "node:assert/strict";
import { DATA_VERSION } from "../src/domain/types.js";
import { migrateState } from "../src/domain/migrations.js";

test("migrateState creates a valid default state", () => {
  const state = migrateState(null);
  assert.equal(state.version, DATA_VERSION);
  assert.equal(state.containers.length, 4);
  assert.equal(state.settings.theme, "system");
});

test("migrateState preserves user values and fills new settings", () => {
  const state = migrateState({
    version: 1,
    containers: [],
    settings: { theme: "dark" },
  });
  assert.equal(state.version, DATA_VERSION);
  assert.equal(state.settings.theme, "dark");
  assert.equal(state.settings.animations, true);
});
