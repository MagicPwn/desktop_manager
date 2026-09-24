import {
  AppWindow,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type { DesktopItem, IconSize } from "../domain/types";

interface IconTileProps {
  item: DesktopItem;
  size: IconSize;
  containerId: string;
  onOpen(): void;
  onRemove(): void;
}

function ItemIcon({ item }: { item: DesktopItem }) {
  if (item.kind === "folder") return <Folder />;
  if (item.kind === "shortcut") return <AppWindow />;
  const extension = item.extension?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension ?? "")) return <FileImage />;
  if (["xlsx", "xls", "csv"].includes(extension ?? "")) return <FileSpreadsheet />;
  if (["zip", "rar", "7z"].includes(extension ?? "")) return <FileArchive />;
  if (["ts", "tsx", "js", "json", "rs"].includes(extension ?? "")) return <FileCode2 />;
  if (["txt", "md", "doc", "docx", "pdf"].includes(extension ?? "")) return <FileText />;
  return <File />;
}

export function IconTile({ item, size, containerId, onOpen, onRemove }: IconTileProps) {
  return (
    <div
      className={`icon-tile icon-${size}`}
      title={item.path}
      onDoubleClick={onOpen}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-desktop-manager-item", JSON.stringify({ containerId, itemId: item.id }));
      }}
    >
      <div className="icon-visual"><ItemIcon item={item} /></div>
      <span>{item.name}</span>
      <details className="item-menu">
        <summary aria-label="项目菜单" title="项目菜单"><MoreHorizontal /></summary>
        <div className="menu-popover">
          <button onClick={onOpen}>打开</button>
          <button className="danger" onClick={onRemove}><Trash2 />移除</button>
        </div>
      </details>
    </div>
  );
}
