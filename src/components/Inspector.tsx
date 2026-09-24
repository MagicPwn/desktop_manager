import { Eye, Lock, SlidersHorizontal, X } from "lucide-react";
import type { AccentColor, IconSize, WorkspaceContainer } from "../domain/types";

interface InspectorProps {
  container: WorkspaceContainer;
  onClose(): void;
  onPatch(before: Partial<WorkspaceContainer>, after: Partial<WorkspaceContainer>, label?: string): void;
}

const colors: AccentColor[] = ["blue", "teal", "coral", "yellow", "violet", "graphite"];

export function Inspector({ container, onClose, onPatch }: InspectorProps) {
  const patch = <K extends keyof WorkspaceContainer>(key: K, value: WorkspaceContainer[K], label: string) => {
    onPatch({ [key]: container[key] }, { [key]: value }, label);
  };

  return (
    <aside className="inspector" aria-label="容器属性">
      <header><div><SlidersHorizontal /><h2>容器属性</h2></div><button className="icon-button" title="关闭" onClick={onClose}><X /></button></header>
      <div className="inspector-content">
        <section>
          <h3>外观</h3>
          <label>强调色</label>
          <div className="swatches">
            {colors.map((color) => <button key={color} className={`swatch color-${color}${container.color === color ? " active" : ""}`} aria-label={color} onClick={() => patch("color", color, "修改容器颜色")} />)}
          </div>
          <label htmlFor="opacity">透明度 <output>{Math.round(container.opacity * 100)}%</output></label>
          <input id="opacity" type="range" min="0.55" max="1" step="0.05" value={container.opacity} onChange={(event) => patch("opacity", Number(event.target.value), "修改容器透明度")} />
        </section>
        <section>
          <h3>图标</h3>
          <label>图标大小</label>
          <div className="segmented-control">
            {(["small", "medium", "large"] as IconSize[]).map((size) => (
              <button key={size} className={container.iconSize === size ? "active" : ""} onClick={() => patch("iconSize", size, "修改图标大小")}>{size === "small" ? "小" : size === "medium" ? "中" : "大"}</button>
            ))}
          </div>
        </section>
        <section>
          <h3>行为</h3>
          <label className="toggle-row"><span><Lock />锁定位置</span><input type="checkbox" checked={container.locked} onChange={(event) => patch("locked", event.target.checked, "修改锁定状态")} /></label>
          <label className="toggle-row"><span><Eye />显示容器</span><input type="checkbox" checked={!container.hidden} onChange={(event) => patch("hidden", !event.target.checked, "修改显示状态")} /></label>
        </section>
        {container.kind === "folder" && <section><h3>映射文件夹</h3><code>{container.folderPath}</code><p>删除此容器不会删除文件夹及其内容。</p></section>}
      </div>
    </aside>
  );
}
