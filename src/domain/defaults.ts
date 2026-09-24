import { DATA_VERSION, type AccentColor, type WorkspaceContainer, type WorkspaceState } from "./types.js";

const DEFAULT_MONITOR = {
  id: "primary",
  name: "主显示器",
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  scaleFactor: 1,
  primary: true,
};

const colors: AccentColor[] = ["blue", "teal", "coral", "yellow"];

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createContainer(
  title: string,
  index: number,
  overrides: Partial<WorkspaceContainer> = {},
): WorkspaceContainer {
  const now = Date.now();
  return {
    id: createId("container"),
    title,
    kind: "standard",
    bounds: {
      x: 44 + (index % 2) * 410,
      y: 92 + Math.floor(index / 2) * 320,
      width: 374,
      height: 280,
    },
    monitorId: "primary",
    items: [],
    collapsed: false,
    hidden: false,
    locked: false,
    color: colors[index % colors.length],
    opacity: 0.84,
    iconSize: "medium",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createDefaultState(): WorkspaceState {
  return {
    version: DATA_VERSION,
    onboardingComplete: false,
    containersHidden: false,
    containers: ["常用应用", "工作", "文件", "临时区域"].map((title, index) =>
      createContainer(title, index),
    ),
    monitors: [DEFAULT_MONITOR],
    settings: {
      theme: "system",
      transparency: true,
      highContrast: false,
      animations: true,
      startWithWindows: false,
      hideShortcut: "Ctrl+Alt+D",
      doubleClickToHide: true,
    },
    lastSavedAt: Date.now(),
  };
}
