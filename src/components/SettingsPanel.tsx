import { MonitorCog, X } from "lucide-react";
import type { AppSettings, ThemeMode } from "../domain/types";

interface SettingsPanelProps {
  settings: AppSettings;
  onChange(settings: Partial<AppSettings>): void;
  onClose(): void;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  return (
    <aside className="settings-panel" aria-label="设置">
      <header><div><MonitorCog /><h2>设置</h2></div><button className="icon-button" title="关闭" onClick={onClose}><X /></button></header>
      <div className="settings-content">
        <section>
          <h3>外观</h3>
          <label>主题</label>
          <div className="segmented-control">
            {(["system", "light", "dark"] as ThemeMode[]).map((theme) => <button key={theme} className={settings.theme === theme ? "active" : ""} onClick={() => onChange({ theme })}>{theme === "system" ? "跟随系统" : theme === "light" ? "浅色" : "深色"}</button>)}
          </div>
          <label className="toggle-row"><span>半透明效果</span><input type="checkbox" checked={settings.transparency} onChange={(event) => onChange({ transparency: event.target.checked })} /></label>
          <label className="toggle-row"><span>高对比度</span><input type="checkbox" checked={settings.highContrast} onChange={(event) => onChange({ highContrast: event.target.checked })} /></label>
          <label className="toggle-row"><span>界面动画</span><input type="checkbox" checked={settings.animations} onChange={(event) => onChange({ animations: event.target.checked })} /></label>
        </section>
        <section>
          <h3>桌面行为</h3>
          <label className="toggle-row"><span>双击桌面隐藏容器</span><input type="checkbox" checked={settings.doubleClickToHide} onChange={(event) => onChange({ doubleClickToHide: event.target.checked })} /></label>
          <label className="toggle-row"><span>开机启动</span><input type="checkbox" checked={settings.startWithWindows} onChange={(event) => onChange({ startWithWindows: event.target.checked })} /></label>
          <label htmlFor="shortcut">显示/隐藏快捷键</label>
          <input
            id="shortcut"
            className="text-input"
            defaultValue={settings.hideShortcut}
            onBlur={(event) => onChange({ hideShortcut: event.target.value })}
            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          />
        </section>
        <section><h3>数据</h3><p>配置、布局和容器数据使用版本化格式保存，可在升级时自动迁移。</p></section>
      </div>
    </aside>
  );
}
