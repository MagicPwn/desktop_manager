export const DATA_VERSION = 2;

export type ThemeMode = "system" | "light" | "dark";
export type ContainerKind = "standard" | "folder";
export type IconSize = "small" | "medium" | "large";
export type AccentColor = "blue" | "teal" | "coral" | "yellow" | "violet" | "graphite";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  primary: boolean;
}

export interface DesktopItem {
  id: string;
  name: string;
  path: string;
  kind: "file" | "folder" | "shortcut";
  extension?: string;
  modifiedAt?: number;
  iconHint?: string;
}

export interface WorkspaceContainer {
  id: string;
  title: string;
  kind: ContainerKind;
  folderPath?: string;
  bounds: Bounds;
  monitorId: string;
  items: DesktopItem[];
  collapsed: boolean;
  hidden: boolean;
  locked: boolean;
  color: AccentColor;
  opacity: number;
  iconSize: IconSize;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: ThemeMode;
  transparency: boolean;
  highContrast: boolean;
  animations: boolean;
  startWithWindows: boolean;
  hideShortcut: string;
  doubleClickToHide: boolean;
}

export interface WorkspaceState {
  version: number;
  onboardingComplete: boolean;
  containersHidden: boolean;
  containers: WorkspaceContainer[];
  monitors: MonitorSnapshot[];
  settings: AppSettings;
  lastSavedAt: number;
}

export interface PersistedEnvelope {
  version: number;
  payload: unknown;
}

export interface FolderChange {
  containerId: string;
  upsert: DesktopItem[];
  removedPaths: string[];
}
