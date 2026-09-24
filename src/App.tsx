import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, LayoutGrid } from "lucide-react";
import { useWorkspace } from "./application/useWorkspace";
import {
  addContainerCommand,
  addItemsCommand,
  changeBoundsCommand,
  moveItemCommand,
  patchContainerCommand,
  removeContainerCommand,
  removeItemCommand,
  renameContainerCommand,
} from "./application/workspace";
import { createContainer, createDefaultState, createId } from "./domain/defaults";
import type { DesktopItem, WorkspaceContainer, WorkspaceState } from "./domain/types";
import { createPlatformAdapter } from "./platform";
import { performanceMonitor } from "./infrastructure/performance";
import { ContainerCard } from "./components/ContainerCard";
import { HiddenTray } from "./components/HiddenTray";
import { Inspector } from "./components/Inspector";
import { Onboarding } from "./components/Onboarding";
import { SettingsPanel } from "./components/SettingsPanel";
import { Toolbar } from "./components/Toolbar";

function fileItems(files: FileList): DesktopItem[] {
  return Array.from(files).map((file) => {
    const path = (file as File & { path?: string }).path || file.name;
    const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    return {
      id: createId("item"),
      name: file.name,
      path,
      kind: "file",
      extension,
      modifiedAt: file.lastModified,
    };
  });
}

function applySuggestions(items: DesktopItem[], state: WorkspaceState): WorkspaceState {
  const targetNames = new Map<string, string>([
    ["lnk", "常用应用"], ["exe", "常用应用"],
    ["doc", "工作"], ["docx", "工作"], ["xls", "工作"], ["xlsx", "工作"], ["ppt", "工作"], ["pptx", "工作"],
    ["txt", "文件"], ["pdf", "文件"], ["zip", "文件"],
  ]);
  return {
    ...state,
    containers: state.containers.map((container) => ({
      ...container,
      items: items.filter((item) => (targetNames.get(item.extension?.toLowerCase() ?? "") ?? "临时区域") === container.title),
    })),
    onboardingComplete: true,
  };
}

export default function App() {
  const adapter = useMemo(createPlatformAdapter, []);
  const workspace = useWorkspace(adapter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [canUndoFile, setCanUndoFile] = useState(false);

  const selected = workspace.state.containers.find((container) => container.id === selectedId);
  const visibleContainers = workspace.state.containers.filter((container) => !container.hidden);
  const hiddenContainers = workspace.state.containers.filter((container) => container.hidden);

  const toggleAll = useCallback(() => {
    workspace.replace((state) => ({ ...state, containersHidden: !state.containersHidden }));
  }, [workspace.replace]);

  useEffect(() => performanceMonitor.start(), []);

  useEffect(() => {
    if (workspace.ready) performanceMonitor.markReady();
  }, [workspace.ready]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        toggleAll();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? workspace.redo() : workspace.undo();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        workspace.redo();
      }
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleAll, workspace]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    adapter.onToggleShortcut(toggleAll).then((unlisten) => { stop = unlisten; }).catch(() => undefined);
    adapter.setToggleShortcut(workspace.state.settings.hideShortcut).catch(() => workspace.showNotice("全局快捷键注册失败"));
    return () => stop?.();
  }, [adapter, toggleAll, workspace.state.settings.hideShortcut]);

  useEffect(() => {
    document.documentElement.dataset.theme = workspace.state.settings.theme;
    document.documentElement.dataset.contrast = workspace.state.settings.highContrast ? "high" : "normal";
  }, [workspace.state.settings.highContrast, workspace.state.settings.theme]);

  const addFolder = async () => {
    const path = await adapter.chooseFolder();
    if (!path) return;
    try {
      const items = await adapter.listFolder(path);
      workspace.execute(addContainerCommand("folder", path, items));
      workspace.showNotice("文件夹容器已创建");
    } catch (error) {
      workspace.showNotice(error instanceof Error ? error.message : "无法读取文件夹");
    }
  };

  const rename = (container: WorkspaceContainer) => {
    const name = window.prompt("输入新的容器名称", container.title)?.trim();
    if (name && name !== container.title) workspace.execute(renameContainerCommand(container.id, container.title, name));
  };

  const removeContainer = (container: WorkspaceContainer) => {
    const folderMessage = container.kind === "folder" ? "\n对应文件夹和内容会保留。" : "\n容器内项目的真实文件会保留。";
    if (!window.confirm(`确定删除“${container.title}”容器吗？${folderMessage}`)) return;
    workspace.execute(removeContainerCommand(workspace.state, container.id));
    if (selectedId === container.id) setSelectedId(null);
  };

  const removeItem = async (container: WorkspaceContainer, item: DesktopItem) => {
    if (container.kind === "standard") {
      workspace.execute(removeItemCommand(container.id, item));
      return;
    }
    if (!window.confirm(`即将把“${item.name}”移入应用回收区。此操作可以撤销，是否继续？`)) return;
    try {
      await adapter.deleteFile(item.path);
      workspace.updateFolderItems(container.id, container.items.filter((entry) => entry.id !== item.id));
      setCanUndoFile(true);
      workspace.showNotice("文件已移入应用回收区，可撤销");
    } catch (error) {
      workspace.showNotice(error instanceof Error ? error.message : "文件删除失败");
    }
  };

  const addPaths = useCallback(async (container: WorkspaceContainer, paths: string[]) => {
    const items: DesktopItem[] = paths.map((path) => ({
      id: createId("item"),
      name: path.split(/[\\/]/).pop() ?? path,
      path,
      kind: "file",
      extension: path.includes(".") ? path.split(".").pop() : undefined,
    }));
    if (container.kind === "standard") {
      workspace.execute(addItemsCommand(container.id, items));
      return;
    }
    if (!container.folderPath || !window.confirm(`将 ${paths.length} 个项目移动到“${container.title}”对应的真实文件夹。是否继续？`)) return;
    try {
      await adapter.moveFiles(paths, container.folderPath);
      workspace.updateFolderItems(container.id, await adapter.listFolder(container.folderPath));
      setCanUndoFile(true);
      workspace.showNotice("文件移动完成");
    } catch (error) {
      workspace.showNotice(error instanceof Error ? error.message : "文件移动失败");
    }
  }, [adapter, workspace.execute, workspace.showNotice, workspace.updateFolderItems]);

  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    adapter.onFileDrop((paths, position) => {
      const scale = window.devicePixelRatio || 1;
      const element = document.elementFromPoint(position.x / scale, position.y / scale);
      const id = element?.closest<HTMLElement>("[data-container-id]")?.dataset.containerId;
      const target = workspace.state.containers.find((container) => container.id === id);
      if (target) void addPaths(target, paths);
      else workspace.execute(addContainerCommand("standard", undefined, paths.map((path) => ({
        id: createId("item"),
        name: path.split(/[\\/]/).pop() ?? path,
        path,
        kind: "file",
        extension: path.includes(".") ? path.split(".").pop() : undefined,
      }))));
    }).then((unlisten) => {
      if (active) stop = unlisten;
      else unlisten();
    }).catch(() => workspace.showNotice("原生文件拖放初始化失败"));
    return () => {
      active = false;
      stop?.();
    };
  }, [adapter, addPaths, workspace.execute, workspace.showNotice, workspace.state.containers]);

  const moveBetweenContainers = async (target: WorkspaceContainer, sourceId: string, itemId: string) => {
    if (target.id === sourceId) return;
    const source = workspace.state.containers.find((container) => container.id === sourceId);
    const item = source?.items.find((entry) => entry.id === itemId);
    if (!source || !item) return;
    if (target.kind === "standard") {
      if (source.kind === "folder") {
        workspace.showNotice("请先将真实文件拖到桌面，再放入普通容器");
        return;
      }
      workspace.execute(moveItemCommand(source.id, target.id, item));
      return;
    }
    if (!target.folderPath || !window.confirm(`将“${item.name}”移动到“${target.title}”对应的真实文件夹。是否继续？`)) return;
    try {
      await adapter.moveFiles([item.path], target.folderPath);
      if (source.kind === "standard") workspace.execute(removeItemCommand(source.id, item));
      else workspace.updateFolderItems(source.id, source.items.filter((entry) => entry.id !== item.id));
      workspace.updateFolderItems(target.id, await adapter.listFolder(target.folderPath));
      setCanUndoFile(true);
      workspace.showNotice("文件移动完成，可撤销");
    } catch (error) {
      workspace.showNotice(error instanceof Error ? error.message : "文件移动失败");
    }
  };

  const refreshFolderContainers = async () => {
    const folders = workspace.state.containers.filter((container) => container.kind === "folder" && container.folderPath);
    await Promise.all(folders.map(async (container) => {
      try { workspace.updateFolderItems(container.id, await adapter.listFolder(container.folderPath!)); } catch { /* watcher will retry */ }
    }));
  };

  const undoLatest = async () => {
    if (!canUndoFile) {
      workspace.undo();
      return;
    }
    try {
      const restored = await adapter.undoFileOperation();
      if (restored) {
        setCanUndoFile(false);
        await refreshFolderContainers();
        workspace.showNotice("真实文件操作已撤销");
      }
    } catch (error) {
      workspace.showNotice(error instanceof Error ? error.message : "文件操作无法撤销");
    }
  };

  const dropOnDesktop = async (event: React.DragEvent<HTMLDivElement>) => {
    const payload = event.dataTransfer.getData("application/x-desktop-manager-item");
    if (payload) {
      const { containerId, itemId } = JSON.parse(payload) as { containerId: string; itemId: string };
      const source = workspace.state.containers.find((container) => container.id === containerId);
      const item = source?.items.find((entry) => entry.id === itemId);
      if (!source || !item) return;
      if (source.kind === "standard") {
        workspace.execute(removeItemCommand(source.id, item));
      } else if (window.confirm(`将“${item.name}”移动到 Windows 桌面。是否继续？`)) {
        try {
          await adapter.moveToDesktop([item.path]);
          workspace.updateFolderItems(source.id, source.items.filter((entry) => entry.id !== item.id));
          setCanUndoFile(true);
          workspace.showNotice("文件已移动到桌面，可撤销");
        } catch (error) {
          workspace.showNotice(error instanceof Error ? error.message : "文件移动失败");
        }
      }
      return;
    }
    const files = fileItems(event.dataTransfer.files);
    if (files.length) workspace.execute(addContainerCommand("standard", undefined, files));
  };

  const resetLayout = () => {
    if (!window.confirm("恢复四个默认容器的布局？容器中的图标归属将被保留。")) return;
    const defaults = createDefaultState().containers;
    const byTitle = new Map(workspace.state.containers.map((container) => [container.title, container]));
    const next = defaults.map((container) => ({ ...container, ...(byTitle.get(container.title) ?? {}), bounds: container.bounds }));
    workspace.setContainers([...next, ...workspace.state.containers.filter((container) => !defaults.some(({ title }) => title === container.title))]);
    workspace.showNotice("默认布局已恢复");
  };

  const finishOnboarding = async (choice: "keep" | "uncategorized" | "suggest") => {
    let items: DesktopItem[] = [];
    if (choice !== "keep") {
      try { items = await adapter.listDesktopItems(); } catch { workspace.showNotice("无法读取当前桌面项目"); }
    }
    workspace.replace((state) => {
      if (choice === "uncategorized") {
        return { ...state, onboardingComplete: true, containers: [...state.containers, createContainer("未分类", state.containers.length, { items })] };
      }
      if (choice === "suggest") return applySuggestions(items, state);
      return { ...state, onboardingComplete: true };
    });
    workspace.showNotice(choice === "suggest" ? "整理建议已应用，可随时调整" : "工作区已准备好");
  };

  if (!workspace.ready) {
    return <main className="loading-screen"><LayoutGrid /><span>正在恢复工作区...</span></main>;
  }

  return (
    <main className={`app-shell${workspace.state.settings.highContrast ? " high-contrast" : ""}`}>
      <Toolbar
        hidden={workspace.state.containersHidden}
        canUndo={workspace.canUndo || canUndoFile}
        canRedo={workspace.canRedo}
        onAdd={() => workspace.execute(addContainerCommand("standard"))}
        onAddFolder={addFolder}
        onToggleHidden={toggleAll}
        onUndo={undoLatest}
        onRedo={workspace.redo}
        onReset={resetLayout}
        onSettings={() => setSettingsOpen(true)}
      />
      <div
        className="desktop-surface"
        onDoubleClick={(event) => {
          if (event.target === event.currentTarget && workspace.state.settings.doubleClickToHide) toggleAll();
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          if (event.target !== event.currentTarget) return;
          void dropOnDesktop(event);
        }}
      >
        <div className="surface-status"><span className="status-dot" />{workspace.state.monitors.length} 个显示器 · 布局已保存</div>
        {!workspace.state.containersHidden && visibleContainers.map((container) => (
          <ContainerCard
            key={container.id}
            container={container}
            selected={container.id === selectedId}
            transparency={workspace.state.settings.transparency}
            animations={workspace.state.settings.animations}
            onSelect={() => setSelectedId(container.id)}
            onBoundsChange={(before, after) => workspace.execute(changeBoundsCommand(container.id, before, after, container.monitorId))}
            onPatch={(before, after, label) => workspace.execute(patchContainerCommand(container.id, before, after, label))}
            onRename={() => rename(container)}
            onDelete={() => removeContainer(container)}
            onOpenPath={(path) => adapter.openPath(path).catch(() => workspace.showNotice("无法打开该路径"))}
            onRemoveItem={(item) => removeItem(container, item)}
            onExternalFiles={(paths) => addPaths(container, paths)}
            onInternalItem={(sourceId, itemId) => moveBetweenContainers(container, sourceId, itemId)}
          />
        ))}
        {workspace.state.containersHidden && <div className="all-hidden"><CheckCircle2 /><strong>容器已隐藏</strong><span>按 Ctrl + Alt + D 恢复</span></div>}
      </div>
      <HiddenTray containers={hiddenContainers} onShow={(container) => workspace.execute(patchContainerCommand(container.id, { hidden: true }, { hidden: false }, "显示容器"))} />
      {selected && !settingsOpen && <Inspector container={selected} onClose={() => setSelectedId(null)} onPatch={(before, after, label) => workspace.execute(patchContainerCommand(selected.id, before, after, label))} />}
      {settingsOpen && <SettingsPanel settings={workspace.state.settings} onClose={() => setSettingsOpen(false)} onChange={(settings) => {
        workspace.patchSettings(settings);
        if (settings.startWithWindows !== undefined) adapter.setStartWithWindows(settings.startWithWindows).catch(() => workspace.showNotice("开机启动设置失败"));
      }} />}
      {!workspace.state.onboardingComplete && <Onboarding onComplete={finishOnboarding} />}
      {workspace.notice && <div className="toast"><Info />{workspace.notice}</div>}
      <div className="safety-note"><AlertTriangle />文件夹容器中的移动和删除会操作真实文件</div>
    </main>
  );
}
