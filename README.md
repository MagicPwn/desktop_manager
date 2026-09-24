# Windows 桌面管理器

基于 Tauri 2、React 和 TypeScript 的 Windows 桌面工作区管理器，实现范围以 [DESIGN.md](DESIGN.md) 为准。

## 已实现

- 普通容器：创建、删除、重命名、移动、缩放、拖放、图标网格、大小、折叠、隐藏、锁定、颜色和透明度。
- 文件夹容器：目录映射、增量监控、打开原路径、真实文件移动/删除确认和应用级撤销。
- 桌面融合：挂载到 Windows `WorkerW`，保留原生桌面图标，窗口覆盖多显示器虚拟桌面。
- 布局恢复：版本化持久化、备份、数据迁移、分辨率变化后的相对位置恢复。
- 首次启动：四个默认容器，以及保持现状、未分类和类型建议三种选择。
- 设置：明暗主题、跟随系统、高对比度、关闭透明度、关闭动画、全局快捷键和开机启动。
- 性能：文件事件增量更新、100 项以上图标虚拟化、保存防抖、长任务和帧间隔采样。

## 开发

Linux 适合开发 UI、领域逻辑和通用文件服务：

```bash
npm ci
npm run dev
npm test
npm run build
```

浏览器预览使用本地存储和模拟文件夹数据，不会操作真实文件。

Windows 原生开发需要 Node.js 22、Rust stable、Visual Studio C++ Build Tools 和 WebView2：

```powershell
npm ci
npm run tauri dev
npm run tauri build -- --bundles nsis
```

Windows 专属行为必须在 Windows 实机或 `.github/workflows/windows.yml` 中验证，包括桌面挂载、Explorer 拖放、全局快捷键、DPI、多显示器和安装包。

## 架构

- `src/domain`：容器、图标、显示器模型，迁移和布局算法。
- `src/application`：命令历史、撤销、状态编排和保存策略。
- `src/components`：工作区、容器、设置和首次启动界面。
- `src/platform`：浏览器预览与 Tauri 平台适配器。
- `src/infrastructure`：性能采样等横切能力。
- `src-tauri`：Windows 桌面挂载、文件监控、持久化和 Shell 集成。

## 数据安全

普通容器只改变图标分组关系。文件夹容器会操作真实文件，移动和删除前均要求确认；删除文件进入应用数据目录下的回收区，可在当前会话撤销。删除任意容器都不会删除其文件或映射文件夹。

## 性能测量

先构建 release 应用，然后在 Windows PowerShell 中运行：

```powershell
npm run tauri build -- --no-bundle
powershell -ExecutionPolicy Bypass -File scripts/measure-performance.ps1
```

脚本测量启动时间、30 秒空闲 CPU 和应用进程树内存，并对设计目标超限给出警告。WebView2、显卡驱动和系统服务会影响结果，应在目标硬件上保留测量记录。
