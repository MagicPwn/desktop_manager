import type { PlatformAdapter } from "./adapter";
import type { DesktopItem, FolderChange, MonitorSnapshot, WorkspaceState } from "../domain/types";

const STORAGE_KEY = "desktop-manager.workspace.v2";

export class BrowserAdapter implements PlatformAdapter {
  async loadState(): Promise<unknown> {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  }

  async saveState(state: WorkspaceState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async getMonitors(): Promise<MonitorSnapshot[]> {
    return [{
      id: "primary",
      name: "当前显示器",
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      scaleFactor: window.devicePixelRatio,
      primary: true,
    }];
  }

  async listDesktopItems(): Promise<DesktopItem[]> {
    return [];
  }

  async chooseFolder(): Promise<string | null> {
    return window.prompt("请输入要映射的文件夹路径", "C:\\Users\\Public\\Documents");
  }

  async listFolder(path: string): Promise<DesktopItem[]> {
    const names = ["项目计划.docx", "会议记录.txt", "素材", "预算表.xlsx", "参考资料.pdf"];
    return names.map((name, index) => ({
      id: `${path}-${name}`,
      name,
      path: `${path}\\${name}`,
      kind: index === 2 ? "folder" : "file",
      extension: name.includes(".") ? name.split(".").pop() : undefined,
      modifiedAt: Date.now() - index * 3600000,
    }));
  }

  async watchFolder(_containerId: string, _path: string, _onChange: (change: FolderChange) => void): Promise<() => void> {
    return () => undefined;
  }

  async openPath(path: string): Promise<void> {
    console.info("Open path", path);
  }

  async moveFiles(_paths: string[], _targetFolder: string): Promise<void> {
    throw new Error("真实文件移动只在 Windows 应用中可用");
  }

  async moveFile(_path: string, _targetPath: string): Promise<void> {
    throw new Error("真实文件移动只在 Windows 应用中可用");
  }

  async deleteFile(_path: string): Promise<void> {
    throw new Error("真实文件删除只在 Windows 应用中可用");
  }

  async moveToDesktop(_paths: string[]): Promise<void> {
    throw new Error("真实文件移动只在 Windows 应用中可用");
  }

  async undoFileOperation(): Promise<boolean> {
    return false;
  }

  async onToggleShortcut(_callback: () => void): Promise<() => void> {
    return () => undefined;
  }

  async onFileDrop(_callback: (paths: string[], position: { x: number; y: number }) => void): Promise<() => void> {
    return () => undefined;
  }

  async setToggleShortcut(_shortcut: string): Promise<void> {
    return undefined;
  }

  async setStartWithWindows(_enabled: boolean): Promise<void> {
    return undefined;
  }
}
