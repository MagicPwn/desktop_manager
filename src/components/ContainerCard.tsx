import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  FolderOpen,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Unlock,
} from "lucide-react";
import type { Bounds, DesktopItem, WorkspaceContainer } from "../domain/types";
import { VirtualIconGrid } from "./VirtualIconGrid";

interface ContainerCardProps {
  container: WorkspaceContainer;
  selected: boolean;
  transparency: boolean;
  animations: boolean;
  onSelect(): void;
  onBoundsChange(before: Bounds, after: Bounds): void;
  onPatch(before: Partial<WorkspaceContainer>, after: Partial<WorkspaceContainer>, label?: string): void;
  onRename(): void;
  onDelete(): void;
  onOpenPath(path: string): void;
  onRemoveItem(item: DesktopItem): void;
  onExternalFiles(paths: string[]): void;
  onInternalItem(sourceContainerId: string, itemId: string): void;
}

export function ContainerCard({
  container,
  selected,
  transparency,
  animations,
  onSelect,
  onBoundsChange,
  onPatch,
  onRename,
  onDelete,
  onOpenPath,
  onRemoveItem,
  onExternalFiles,
  onInternalItem,
}: ContainerCardProps) {
  const [draftBounds, setDraftBounds] = useState<Bounds | null>(null);
  const origin = useRef<{ pointerX: number; pointerY: number; bounds: Bounds } | null>(null);
  const bounds = draftBounds ?? container.bounds;

  const beginMove = (event: ReactPointerEvent) => {
    if (container.locked || (event.target as HTMLElement).closest("button, summary, input, .container-body")) return;
    onSelect();
    origin.current = { pointerX: event.clientX, pointerY: event.clientY, bounds: container.bounds };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: ReactPointerEvent) => {
    if (!origin.current) return;
    setDraftBounds({
      ...origin.current.bounds,
      x: origin.current.bounds.x + event.clientX - origin.current.pointerX,
      y: origin.current.bounds.y + event.clientY - origin.current.pointerY,
    });
  };

  const endMove = () => {
    if (origin.current && draftBounds) onBoundsChange(origin.current.bounds, draftBounds);
    origin.current = null;
    setDraftBounds(null);
  };

  const beginResize = (event: ReactPointerEvent) => {
    event.stopPropagation();
    if (container.locked) return;
    origin.current = { pointerX: event.clientX, pointerY: event.clientY, bounds: container.bounds };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resize = (event: ReactPointerEvent) => {
    if (!origin.current) return;
    setDraftBounds({
      ...origin.current.bounds,
      width: Math.max(250, origin.current.bounds.width + event.clientX - origin.current.pointerX),
      height: Math.max(180, origin.current.bounds.height + event.clientY - origin.current.pointerY),
    });
  };

  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = event.dataTransfer.getData("application/x-desktop-manager-item");
    if (payload) {
      const parsed = JSON.parse(payload) as { containerId: string; itemId: string };
      onInternalItem(parsed.containerId, parsed.itemId);
      return;
    }
    const paths = Array.from(event.dataTransfer.files)
      .map((file) => (file as File & { path?: string }).path)
      .filter((path): path is string => Boolean(path));
    if (paths.length) onExternalFiles(paths);
  };

  return (
    <section
      className={`container-card color-${container.color}${selected ? " selected" : ""}${container.collapsed ? " collapsed" : ""}${transparency ? " translucent" : " opaque"}${animations ? " animated" : ""}`}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: container.collapsed ? 54 : bounds.height,
        "--container-opacity": `${container.opacity * 100}%`,
      } as CSSProperties}
      onPointerDown={beginMove}
      onPointerMove={move}
      onPointerUp={endMove}
      onClick={onSelect}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
      data-container-id={container.id}
    >
      <header className="container-header">
        <div className="container-heading">
          <span className="accent-dot" />
          <div>
            <h2>{container.title}</h2>
            <span>{container.kind === "folder" ? "文件夹容器" : `${container.items.length} 个项目`}</span>
          </div>
        </div>
        <div className="container-actions">
          {container.kind === "folder" && container.folderPath && (
            <button className="icon-button" title="打开原文件夹" onClick={() => onOpenPath(container.folderPath!)}><FolderOpen /></button>
          )}
          <button
            className="icon-button"
            title={container.locked ? "解锁" : "锁定"}
            onClick={() => onPatch({ locked: container.locked }, { locked: !container.locked }, container.locked ? "解锁容器" : "锁定容器")}
          >{container.locked ? <Lock /> : <Unlock />}</button>
          <button
            className="icon-button"
            title={container.collapsed ? "展开" : "折叠"}
            onClick={() => onPatch({ collapsed: container.collapsed }, { collapsed: !container.collapsed }, container.collapsed ? "展开容器" : "折叠容器")}
          >{container.collapsed ? <ChevronDown /> : <ChevronUp />}</button>
          <details className="card-menu">
            <summary className="icon-button" aria-label="容器菜单" title="容器菜单"><MoreHorizontal /></summary>
            <div className="menu-popover">
              <button onClick={onRename}><Pencil />重命名</button>
              <button onClick={() => onPatch({ hidden: false }, { hidden: true }, "隐藏容器")}><EyeOff />隐藏</button>
              <button className="danger" onClick={onDelete}><Trash2 />删除容器</button>
            </div>
          </details>
        </div>
      </header>
      {!container.collapsed && (
        container.items.length ? (
          <VirtualIconGrid
            items={container.items}
            size={container.iconSize}
            containerId={container.id}
            width={bounds.width}
            height={bounds.height - 52}
            onOpen={(item) => onOpenPath(item.path)}
            onRemove={onRemoveItem}
          />
        ) : (
          <div className="container-body">
            <div className="empty-state">
              <FolderOpen />
              <strong>{container.kind === "folder" ? "文件夹为空" : "拖入桌面项目"}</strong>
              <span>{container.kind === "folder" ? "文件变化会自动同步" : "仅建立分组，不移动原文件"}</span>
            </div>
          </div>
        )
      )}
      {!container.collapsed && !container.locked && (
        <button className="resize-handle" aria-label="调整容器大小" onPointerDown={beginResize} onPointerMove={resize} onPointerUp={endMove} />
      )}
    </section>
  );
}
