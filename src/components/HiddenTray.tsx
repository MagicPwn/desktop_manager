import { Eye } from "lucide-react";
import type { WorkspaceContainer } from "../domain/types";

interface HiddenTrayProps {
  containers: WorkspaceContainer[];
  onShow(container: WorkspaceContainer): void;
}

export function HiddenTray({ containers, onShow }: HiddenTrayProps) {
  if (!containers.length) return null;
  return (
    <div className="hidden-tray">
      <Eye />
      <span>已隐藏</span>
      {containers.map((container) => <button key={container.id} onClick={() => onShow(container)}>{container.title}</button>)}
    </div>
  );
}
