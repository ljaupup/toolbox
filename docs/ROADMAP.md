# 路线图

最后更新：2026-05-01

## 已完成

1. 建立基于 `manifest.json` 的内置插件自动发现与注册。
2. 实现 PySide6 + Qt WebEngine + Qt WebChannel 的桌面宿主。
3. 实现结构化 JSONL 日志。
4. 完成当前内置工具：`sleep_control`、`batch_rename`、`clipboard_history`、`format_validator`、`keygen_tool`、`time_converter`。
5. 为 `time_converter` 增加专用 UI，并用自定义下拉控件规避 Qt WebEngine 原生 `select` 渲染问题。
6. 将前端 JavaScript 拆分为 ES Modules，降低 `app.js` 单文件膨胀风险。
7. 为 `keygen_tool` 增加文件哈希能力。
8. 将前端内置工具逻辑拆分到 `web/js/tools/*`，降低 `main.js` 与 `renderers.js` 膨胀风险。
9. 为工具动作返回结构补充 `code/message/state` 字段，并保留旧 `error` 字段兼容。
10. 将 `keygen_tool` 的纯业务逻辑拆分到 `service.py`。

## 近期

1. 拆分 `app.css`，形成 `base/layout/components/tools` 等更清晰的样式组织。
2. 补充插件层单元测试与注册契约测试。
3. 增加日志轮转和保留策略。
4. 提供统一的高风险动作确认中间层。
5. 补充插件开发模板和脚手架命令。

## 中期

1. 增加插件配置持久化，例如 `.data/config/plugins.json`。
2. 支持工具级权限声明与运行时权限提示。
3. 优化通用插件面板，降低 JSON payload 手写成本。
4. 评估是否需要引入 React/Vue；仅当工具页状态复杂度继续上升时再推进。

## 长期

1. 建立 Windows/macOS/Linux 能力矩阵。
2. 支持插件市场化分发约定，包括签名、版本和兼容策略。
3. 推进 UI 元数据驱动，减少新增专用工具页时的重复前端代码。
