# 首版验收映射

| 设计要求 | 实现证据 | 自动验证 |
| --- | --- | --- |
| 普通容器完整管理 | `src/components/ContainerCard.tsx`、`src/application/workspace.ts` | TypeScript build |
| 文件夹容器与实时变化 | `src-tauri/src/lib.rs` 的 `watch_folder` 增量事件 | Windows `cargo check` |
| 普通容器不移动真实文件 | `addItemsCommand` 只修改状态；平台调用仅位于文件夹分支 | 领域测试与代码边界 |
| 真实文件操作提示与撤销 | `src/App.tsx` 确认流程、Rust `FileOperation` 历史 | Windows 手工流程 |
| 重启后保持布局 | 原子 `workspace.json`、备份和迁移 | 迁移测试 |
| 多显示器和分辨率恢复 | 虚拟桌面窗口、监视器归一化、`restoreLayouts` | 布局测试、Windows 手工流程 |
| 大量图标流畅 | `VirtualIconGrid` 可视区域渲染 | 前端 build、目标机测量 |
| 后台资源稳定 | 事件式监控、保存防抖、Tauri 原生壳 | `measure-performance.ps1` |
| 数据版本迁移 | `DATA_VERSION`、`migrateState` | 迁移测试 |
| 主题和可访问性 | CSS system/light/dark/high contrast、透明度与动画开关 | 前端 build、手工视觉检查 |

## Windows 手工检查

1. 确认 Windows 原生桌面图标仍可使用，容器显示在图标后方的桌面层。
2. 使用不同缩放比例的两台显示器，移动容器后重启并改变分辨率，确认容器保持可达。
3. 从 Explorer 拖入文件夹容器，确认提示后真实移动；执行撤销并核对原路径。
4. 删除文件夹容器，确认映射文件夹及内容保留；删除其中项目，确认进入应用回收区并可撤销。
5. 验证 `Ctrl+Alt+D`、双击桌面、开机启动、明暗主题、高对比度和关闭透明度。
6. 放入 1,000 个以上项目，滚动和拖动容器，并运行 `scripts/measure-performance.ps1` 记录指标。
