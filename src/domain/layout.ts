import type { Bounds, MonitorSnapshot, WorkspaceContainer } from "./types.js";

const MIN_WIDTH = 250;
const MIN_HEIGHT = 180;

export function clampBounds(bounds: Bounds, monitor: MonitorSnapshot): Bounds {
  const width = Math.min(Math.max(bounds.width, MIN_WIDTH), monitor.width);
  const height = Math.min(Math.max(bounds.height, MIN_HEIGHT), monitor.height);
  return {
    width,
    height,
    x: Math.min(Math.max(bounds.x, monitor.x), monitor.x + monitor.width - width),
    y: Math.min(Math.max(bounds.y, monitor.y), monitor.y + monitor.height - height),
  };
}

export function restoreLayouts(
  containers: WorkspaceContainer[],
  previous: MonitorSnapshot[],
  current: MonitorSnapshot[],
): WorkspaceContainer[] {
  const primary = current.find((monitor) => monitor.primary) ?? current[0];
  if (!primary) return containers;

  return containers.map((container) => {
    const oldMonitor = previous.find((monitor) => monitor.id === container.monitorId);
    const target = current.find((monitor) => monitor.id === container.monitorId) ?? primary;
    if (!oldMonitor) return { ...container, monitorId: target.id, bounds: clampBounds(container.bounds, target) };

    const usesLocalCoordinates = container.bounds.x >= 0 && container.bounds.y >= 0 &&
      container.bounds.x <= oldMonitor.width && container.bounds.y <= oldMonitor.height;
    const localX = usesLocalCoordinates ? container.bounds.x : container.bounds.x - oldMonitor.x;
    const localY = usesLocalCoordinates ? container.bounds.y : container.bounds.y - oldMonitor.y;
    const relativeX = localX / Math.max(oldMonitor.width, 1);
    const relativeY = localY / Math.max(oldMonitor.height, 1);
    const relativeWidth = container.bounds.width / Math.max(oldMonitor.width, 1);
    const relativeHeight = container.bounds.height / Math.max(oldMonitor.height, 1);

    return {
      ...container,
      monitorId: target.id,
      bounds: clampBounds(
        {
          x: target.x + relativeX * target.width,
          y: target.y + relativeY * target.height,
          width: relativeWidth * target.width,
          height: relativeHeight * target.height,
        },
        target,
      ),
    };
  });
}
