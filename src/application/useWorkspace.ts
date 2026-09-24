import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createDefaultState } from "../domain/defaults";
import type { AppSettings, DesktopItem, FolderChange, WorkspaceContainer, WorkspaceState } from "../domain/types";
import type { PlatformAdapter } from "../platform/adapter";
import {
  createHistory,
  executeCommand,
  redo,
  undo,
  type HistoryState,
  type StateCommand,
} from "./history";
import { initializeWorkspace, reconcileMonitors, updateSettings } from "./workspace";

type Action =
  | { type: "load"; state: WorkspaceState }
  | { type: "execute"; command: StateCommand<WorkspaceState> }
  | { type: "replace"; update: (state: WorkspaceState) => WorkspaceState }
  | { type: "undo" }
  | { type: "redo" };

function reducer(history: HistoryState<WorkspaceState>, action: Action): HistoryState<WorkspaceState> {
  switch (action.type) {
    case "load": return createHistory(action.state);
    case "execute": return executeCommand(history, action.command);
    case "replace": return { ...history, present: action.update(history.present) };
    case "undo": return undo(history);
    case "redo": return redo(history);
  }
}

export function useWorkspace(adapter: PlatformAdapter) {
  const [history, dispatch] = useReducer(reducer, createHistory(createDefaultState()));
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    const timer = window.setTimeout(() => setNotice(null), 3200);
    timers.current.push(timer);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([adapter.loadState(), adapter.getMonitors()]).then(([saved, monitors]) => {
      if (!active) return;
      const loaded = initializeWorkspace(saved);
      dispatch({ type: "load", state: reconcileMonitors(loaded, monitors) });
      setReady(true);
    }).catch((error) => {
      console.error(error);
      setReady(true);
      showNotice("读取配置失败，已使用默认布局");
    });
    return () => {
      active = false;
      timers.current.forEach(window.clearTimeout);
    };
  }, [adapter, showNotice]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      adapter.saveState({ ...history.present, lastSavedAt: Date.now() }).catch(() => {
        showNotice("布局保存失败");
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [adapter, history.present, ready, showNotice]);

  useEffect(() => {
    if (!ready) return;
    let timer = 0;
    const refreshMonitors = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        adapter.getMonitors()
          .then((monitors) => dispatch({ type: "replace", update: (state) => reconcileMonitors(state, monitors) }))
          .catch(() => showNotice("显示器布局刷新失败"));
      }, 350);
    };
    window.addEventListener("resize", refreshMonitors);
    return () => {
      window.removeEventListener("resize", refreshMonitors);
      window.clearTimeout(timer);
    };
  }, [adapter, ready, showNotice]);

  useEffect(() => {
    if (!ready) return;
    const unwatchers: Array<() => void> = [];
    const onChange = (change: FolderChange) => dispatch({
      type: "replace",
      update: (state) => ({
        ...state,
        containers: state.containers.map((container) =>
          container.id === change.containerId ? {
            ...container,
            items: [
              ...container.items.filter((item) =>
                !change.removedPaths.includes(item.path) && !change.upsert.some((next) => next.path === item.path),
              ),
              ...change.upsert,
            ],
            updatedAt: Date.now(),
          } : container,
        ),
      }),
    });
    Promise.all(history.present.containers.filter((container) => container.kind === "folder" && container.folderPath)
      .map((container) => adapter.watchFolder(container.id, container.folderPath!, onChange).then((stop) => unwatchers.push(stop))))
      .catch(() => showNotice("部分文件夹无法监控"));
    return () => unwatchers.forEach((stop) => stop());
  }, [adapter, ready, history.present.containers.map(({ id, folderPath }) => `${id}:${folderPath}`).join("|"), showNotice]);

  const execute = useCallback((command: StateCommand<WorkspaceState>) => dispatch({ type: "execute", command }), []);
  const replace = useCallback((update: (state: WorkspaceState) => WorkspaceState) => dispatch({ type: "replace", update }), []);
  const patchSettings = useCallback((settings: Partial<AppSettings>) => {
    replace((state) => updateSettings(state, settings));
  }, [replace]);
  const updateFolderItems = useCallback((id: string, items: DesktopItem[]) => {
    replace((state) => ({
      ...state,
      containers: state.containers.map((container) => container.id === id ? { ...container, items } : container),
    }));
  }, [replace]);
  const setContainers = useCallback((containers: WorkspaceContainer[]) => {
    replace((state) => ({ ...state, containers }));
  }, [replace]);

  return useMemo(() => ({
    state: history.present,
    ready,
    notice,
    execute,
    replace,
    patchSettings,
    updateFolderItems,
    setContainers,
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: history.undoStack.length > 0,
    canRedo: history.redoStack.length > 0,
    undoLabel: history.undoStack.at(-1)?.label,
    redoLabel: history.redoStack.at(-1)?.label,
    showNotice,
  }), [history, notice, ready, execute, replace, patchSettings, setContainers, showNotice, updateFolderItems]);
}
