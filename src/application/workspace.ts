import { createContainer, createDefaultState, createId } from "../domain/defaults";
import { clampBounds, restoreLayouts } from "../domain/layout";
import { migrateState } from "../domain/migrations";
import type {
  AppSettings,
  Bounds,
  DesktopItem,
  WorkspaceContainer,
  WorkspaceState,
} from "../domain/types";
import type { StateCommand } from "./history";

function updateContainer(
  state: WorkspaceState,
  id: string,
  update: (container: WorkspaceContainer) => WorkspaceContainer,
): WorkspaceState {
  return {
    ...state,
    containers: state.containers.map((container) =>
      container.id === id ? { ...update(container), updatedAt: Date.now() } : container,
    ),
  };
}

export function initializeWorkspace(input: unknown): WorkspaceState {
  return migrateState(input ?? createDefaultState());
}

export function addContainerCommand(
  kind: WorkspaceContainer["kind"],
  folderPath?: string,
  items: DesktopItem[] = [],
): StateCommand<WorkspaceState> {
  const container = createContainer(kind === "folder" ? folderPath?.split(/[\\/]/).pop() || "文件夹" : "新容器", 0, {
    id: createId("container"),
    kind,
    folderPath,
    items,
    bounds: { x: 88, y: 124, width: 374, height: 280 },
  });
  return {
    label: kind === "folder" ? "创建文件夹容器" : "创建普通容器",
    execute: (state) => ({ ...state, containers: [...state.containers, container] }),
    undo: (state) => ({ ...state, containers: state.containers.filter(({ id }) => id !== container.id) }),
  };
}

export function removeContainerCommand(state: WorkspaceState, id: string): StateCommand<WorkspaceState> {
  const container = state.containers.find((entry) => entry.id === id);
  const index = state.containers.findIndex((entry) => entry.id === id);
  return {
    label: "删除容器",
    execute: (current) => ({ ...current, containers: current.containers.filter((entry) => entry.id !== id) }),
    undo: (current) => {
      if (!container || current.containers.some((entry) => entry.id === id)) return current;
      const containers = [...current.containers];
      containers.splice(Math.max(index, 0), 0, container);
      return { ...current, containers };
    },
  };
}

export function renameContainerCommand(id: string, before: string, after: string): StateCommand<WorkspaceState> {
  return {
    label: "重命名容器",
    execute: (state) => updateContainer(state, id, (container) => ({ ...container, title: after })),
    undo: (state) => updateContainer(state, id, (container) => ({ ...container, title: before })),
  };
}

export function changeBoundsCommand(id: string, before: Bounds, after: Bounds, beforeMonitorId: string): StateCommand<WorkspaceState> {
  return {
    label: "调整容器布局",
    execute: (state) => updateContainer(state, id, (container) => {
      const centerX = after.x + after.width / 2;
      const centerY = after.y + after.height / 2;
      const monitor = state.monitors.find((entry) =>
        centerX >= entry.x && centerX < entry.x + entry.width && centerY >= entry.y && centerY < entry.y + entry.height,
      ) ?? state.monitors.find((entry) => entry.id === container.monitorId) ?? state.monitors[0];
      return monitor ? { ...container, monitorId: monitor.id, bounds: clampBounds(after, monitor) } : { ...container, bounds: after };
    }),
    undo: (state) => updateContainer(state, id, (container) => ({ ...container, monitorId: beforeMonitorId, bounds: before })),
  };
}

export function patchContainerCommand(
  id: string,
  before: Partial<WorkspaceContainer>,
  after: Partial<WorkspaceContainer>,
  label = "修改容器",
): StateCommand<WorkspaceState> {
  return {
    label,
    execute: (state) => updateContainer(state, id, (container) => ({ ...container, ...after })),
    undo: (state) => updateContainer(state, id, (container) => ({ ...container, ...before })),
  };
}

export function addItemsCommand(id: string, items: DesktopItem[]): StateCommand<WorkspaceState> {
  return {
    label: "放入图标",
    execute: (state) => updateContainer(state, id, (container) => {
      const paths = new Set(container.items.map((item) => item.path));
      return { ...container, items: [...container.items, ...items.filter((item) => !paths.has(item.path))] };
    }),
    undo: (state) => {
      const paths = new Set(items.map((item) => item.path));
      return updateContainer(state, id, (container) => ({
        ...container,
        items: container.items.filter((item) => !paths.has(item.path)),
      }));
    },
  };
}

export function removeItemCommand(containerId: string, item: DesktopItem): StateCommand<WorkspaceState> {
  return {
    label: "移除图标归属",
    execute: (state) => updateContainer(state, containerId, (container) => ({
      ...container,
      items: container.items.filter((entry) => entry.id !== item.id),
    })),
    undo: (state) => updateContainer(state, containerId, (container) => ({
      ...container,
      items: [...container.items, item],
    })),
  };
}

export function moveItemCommand(sourceId: string, targetId: string, item: DesktopItem): StateCommand<WorkspaceState> {
  const move = (state: WorkspaceState, from: string, to: string) => ({
    ...state,
    containers: state.containers.map((container) => {
      if (container.id === from) return { ...container, items: container.items.filter((entry) => entry.id !== item.id), updatedAt: Date.now() };
      if (container.id === to && !container.items.some((entry) => entry.path === item.path)) return { ...container, items: [...container.items, item], updatedAt: Date.now() };
      return container;
    }),
  });
  return {
    label: "移动图标归属",
    execute: (state) => move(state, sourceId, targetId),
    undo: (state) => move(state, targetId, sourceId),
  };
}

export function updateSettings(state: WorkspaceState, settings: Partial<AppSettings>): WorkspaceState {
  return { ...state, settings: { ...state.settings, ...settings } };
}

export function reconcileMonitors(state: WorkspaceState, monitors: WorkspaceState["monitors"]): WorkspaceState {
  return {
    ...state,
    containers: restoreLayouts(state.containers, state.monitors, monitors),
    monitors,
  };
}
