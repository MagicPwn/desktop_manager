import type { DesktopItem, FolderChange, MonitorSnapshot, WorkspaceState } from "../domain/types";

export interface PlatformAdapter {
  loadState(): Promise<unknown>;
  saveState(state: WorkspaceState): Promise<void>;
  getMonitors(): Promise<MonitorSnapshot[]>;
  listDesktopItems(): Promise<DesktopItem[]>;
  chooseFolder(): Promise<string | null>;
  listFolder(path: string): Promise<DesktopItem[]>;
  watchFolder(containerId: string, path: string, onChange: (change: FolderChange) => void): Promise<() => void>;
  openPath(path: string): Promise<void>;
  moveFiles(paths: string[], targetFolder: string): Promise<void>;
  moveFile(path: string, targetPath: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  moveToDesktop(paths: string[]): Promise<void>;
  undoFileOperation(): Promise<boolean>;
  onToggleShortcut(callback: () => void): Promise<() => void>;
  onFileDrop(callback: (paths: string[], position: { x: number; y: number }) => void): Promise<() => void>;
  setToggleShortcut(shortcut: string): Promise<void>;
  setStartWithWindows(enabled: boolean): Promise<void>;
}
