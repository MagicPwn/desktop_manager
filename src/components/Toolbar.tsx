import {
  Eye,
  EyeOff,
  FolderPlus,
  LayoutGrid,
  Plus,
  Redo2,
  RotateCcw,
  Settings,
  Undo2,
} from "lucide-react";

interface ToolbarProps {
  hidden: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onAdd(): void;
  onAddFolder(): void;
  onToggleHidden(): void;
  onUndo(): void;
  onRedo(): void;
  onReset(): void;
  onSettings(): void;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="app-toolbar">
      <div className="brand"><LayoutGrid /><span>桌面管理器</span></div>
      <nav className="toolbar-actions" aria-label="工作区操作">
        <button className="icon-button" title="撤销" disabled={!props.canUndo} onClick={props.onUndo}><Undo2 /></button>
        <button className="icon-button" title="重做" disabled={!props.canRedo} onClick={props.onRedo}><Redo2 /></button>
        <span className="toolbar-divider" />
        <button className="icon-button" title="新建普通容器" onClick={props.onAdd}><Plus /></button>
        <button className="icon-button" title="新建文件夹容器" onClick={props.onAddFolder}><FolderPlus /></button>
        <button className="icon-button" title={props.hidden ? "显示所有容器" : "隐藏所有容器"} onClick={props.onToggleHidden}>
          {props.hidden ? <Eye /> : <EyeOff />}
        </button>
        <button className="icon-button" title="恢复默认布局" onClick={props.onReset}><RotateCcw /></button>
        <button className="icon-button" title="设置" onClick={props.onSettings}><Settings /></button>
      </nav>
    </header>
  );
}
