import { createDefaultState } from "./defaults.js";
import { DATA_VERSION, type WorkspaceState } from "./types.js";

type LegacyState = Partial<WorkspaceState> & { version?: number };

export function migrateState(input: unknown): WorkspaceState {
  const defaults = createDefaultState();
  if (!input || typeof input !== "object") return defaults;

  const legacy = input as LegacyState;
  const containers = Array.isArray(legacy.containers)
    ? legacy.containers.map((container, index) => ({
        ...defaults.containers[index % defaults.containers.length],
        ...container,
        bounds: {
          ...defaults.containers[index % defaults.containers.length].bounds,
          ...container.bounds,
        },
        items: Array.isArray(container.items) ? container.items : [],
        updatedAt: container.updatedAt ?? Date.now(),
      }))
    : defaults.containers;

  return {
    ...defaults,
    ...legacy,
    version: DATA_VERSION,
    containers,
    monitors: Array.isArray(legacy.monitors) && legacy.monitors.length ? legacy.monitors : defaults.monitors,
    settings: { ...defaults.settings, ...legacy.settings },
    lastSavedAt: Date.now(),
  };
}
