import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { PlatformAdapter } from "./adapter";
import type { DesktopItem, FolderChange, MonitorSnapshot, WorkspaceState } from "../domain/types";

export class TauriAdapter implements PlatformAdapter {
  loadState(): Promise<unknown> {
    return invoke("load_state");
  }

  saveState(state: WorkspaceState): Promise<void> {
    return invoke("save_state", { state });
  }

  getMonitors(): Promise<MonitorSnapshot[]> {
    return invoke("get_monitors");
  }

  listDesktopItems(): Promise<DesktopItem[]> {
    return invoke("list_desktop_items");
  }

  chooseFolder(): Promise<string | null> {
    return invoke("choose_folder");
  }

  listFolder(path: string): Promise<DesktopItem[]> {
    return invoke("list_folder", { path });
  }

  async watchFolder(containerId: string, path: string, onChange: (change: FolderChange) => void): Promise<() => void> {
    const stop = await listen<FolderChange>(`folder-change:${containerId}`, ({ payload }) => onChange(payload));
    await invoke("watch_folder", { containerId, path });
    return () => {
      stop();
      void invoke("unwatch_folder", { containerId });
    };
  }

  openPath(path: string): Promise<void> {
    return invoke("open_path", { path });
  }

  moveFiles(paths: string[], targetFolder: string): Promise<void> {
    return invoke("move_files", { paths, targetFolder });
  }

  moveFile(path: string, targetPath: string): Promise<void> {
    return invoke("move_file", { path, targetPath });
  }

  deleteFile(path: string): Promise<void> {
    return invoke("delete_file", { path });
  }

  moveToDesktop(paths: string[]): Promise<void> {
    return invoke("move_to_desktop", { paths });
  }

  undoFileOperation(): Promise<boolean> {
    return invoke("undo_file_operation");
  }

  async onToggleShortcut(callback: () => void): Promise<() => void> {
    return listen("toggle-containers", callback);
  }

  async onFileDrop(callback: (paths: string[], position: { x: number; y: number }) => void): Promise<() => void> {
    return listen<{ paths: string[]; position: { x: number; y: number } }>("tauri://drag-drop", ({ payload }) => {
      callback(payload.paths, payload.position);
    });
  }

  setToggleShortcut(shortcut: string): Promise<void> {
    return invoke("set_toggle_shortcut", { shortcut });
  }

  setStartWithWindows(enabled: boolean): Promise<void> {
    return invoke("set_start_with_windows", { enabled });
  }
}
