# 自定义工具箱架构文档

最后更新：2026-05-01

## 1. 目标

该项目用于把零散脚本能力沉淀为桌面工具，并通过插件机制降低新增工具成本。

核心要求：

- 新增插件时，不修改核心工具列表，也能被自动发现、自动加载、自动出现在 UI。
- 本地优先运行，不依赖远程服务。
- 高风险动作需要在界面侧提供明确确认。
- 简单工具可使用通用插件面板，常用工具可补专用 UI。

## 2. 技术栈

| 层级 | 技术 |
| --- | --- |
| 应用宿主 | Python 3.11+、PySide6、Qt WebEngine、Qt WebChannel |
| 前端界面 | HTML、CSS、原生 JavaScript ES Modules |
| 插件系统 | `manifest.json` + Python 插件类自动发现 |
| 数据与日志 | 本地 JSONL、`.data/` 运行目录 |
| 环境管理 | uv（推荐）或 venv + pip |
| 解析能力 | PyYAML |

当前不引入 React/Vue。原因是项目目标仍是轻量桌面工具箱，现阶段的复杂度可以由 ES Modules 拆分、明确状态对象和少量通用组件承担。后续如果工具页数量和状态复杂度明显上升，再评估引入前端框架。

## 3. 总体架构

```text
+-----------------------------+
| QApplication / main.py      |
+--------------+--------------+
               |
               v
+-----------------------------+
| QMainWindow + QWebEngineView|
| app.py                      |
+--------------+--------------+
               |
               v
+-----------------------------+        WebChannel        +----------------------+
| Web UI                      | <----------------------> | ToolboxBridge       |
| index.html / app.css        |                          | bridge.py           |
| app.js -> web/js/main.js    |                          +----------+-----------+
| web/js/tools/*.js           |                                     |
+-----------------------------+                                     v
                                                       +------------------------+
                                                       | ToolRuntime            |
                                                       | plugins/runtime.py     |
                                                       +-----+-------------+----+
                                                             |             |
                                                             v             v
                                             +----------------------+  +----------------+
                                             | ToolRegistry         |  | LogCore        |
                                             | plugins/registry.py  |  | logging/core.py|
                                             +----------+-----------+  +----------------+
                                                        |
                                                        v
                                             +----------------------+
                                             | Built-in Tool Plugins|
                                             | plugins/builtin/*    |
                                             +----------------------+
```

图形版架构图见：[docs/assets/architecture.svg](assets/architecture.svg)。

分层职责：

| 模块 | 职责 |
| --- | --- |
| `main.py` | 应用入口。 |
| `app.py` | 窗口、WebEngine 宿主、应用生命周期。 |
| `bridge.py` | 前后端协议入口，负责 bootstrap、工具调用、状态推送。 |
| `plugins/registry.py` | 扫描 manifest，动态导入插件类。 |
| `plugins/runtime.py` | 插件实例生命周期、动作分发、状态导出。 |
| `plugins/base.py` | 插件基类、上下文、manifest 数据结构。 |
| `logging/core.py` | JSONL 结构化日志写入。 |
| `web/index.html` | 主界面静态结构和专用工具面板。 |
| `web/app.css` | 当前统一样式入口。 |
| `web/app.js` | 兼容入口，导入 `web/js/main.js`。 |
| `web/js/*` | 前端状态、渲染调度、下拉组件、全局动作等模块。 |
| `web/js/tools/*` | 内置工具的专用事件绑定与渲染逻辑。 |

## 4. 前端模块结构

```text
src/toolbox_app/web/
  index.html
  app.css
  app.js
  js/
    dropdown.js
    main.js
    renderers.js
    state.js
    utils.js
    tools/
      sleep_control.js
      batch_rename.js
      clipboard_history.js
      format_validator.js
      keygen_tool.js
      time_converter.js
      generic_tool.js
      settings.js
```

模块职责：

| 文件 | 职责 |
| --- | --- |
| `app.js` | 保持入口稳定，仅导入 `./js/main.js`。 |
| `js/main.js` | 初始化 bridge、绑定 UI 事件、执行工具动作。 |
| `js/renderers.js` | 渲染工具列表、选择工具、调度工具面板渲染。 |
| `js/state.js` | 前端共享状态、工具图标、输出映射。 |
| `js/dropdown.js` | 自定义下拉控件，避免 Qt WebEngine 原生 select 样式问题。 |
| `js/utils.js` | DOM、状态、转义等通用工具函数。 |
| `js/tools/*.js` | 每个工具的专用事件绑定和状态渲染。 |

## 5. 插件注册系统

### 5.0 命名约定

`src/toolbox_app/plugins` 是内部工程目录名，语义是“可插拔能力模块”。对用户和界面层，统一使用“工具”这个概念。

保留 `plugins` 命名的原因：

- 目录职责不是普通工具函数集合，而是带 manifest、生命周期、权限声明和动作调用契约的插件系统。
- `manifest.entry`、导入路径和文档已经围绕 `toolbox_app.plugins.*` 建立，重命名会产生较大迁移成本。
- 用户侧不暴露 `plugins` 术语，README 和界面可以继续称为“工具”或“内置工具”。

因此当前建议是：内部包名保留 `plugins`，文档中明确“工具是产品概念，插件是工程实现”。

### 5.1 目录规范

```text
src/toolbox_app/plugins/builtin/
  <tool_id>/
    manifest.json
    plugin.py
    service.py      # 可选，复杂业务建议拆出
```

`service.py` 当前不是强制文件。推荐规则：

- 简单工具可只保留 `plugin.py`。
- 业务逻辑超过一个动作、涉及文件/系统/时间等复杂处理时，建议拆出 `service.py`。
- `plugin.py` 负责插件协议、状态管理和日志；`service.py` 负责纯业务逻辑。
- `service.py` 不直接依赖 Qt 对象，不发信号，不写 UI 状态，便于后续单元测试。

### 5.2 manifest 关键字段

| 字段 | 说明 |
| --- | --- |
| `id` | 全局唯一工具 ID。 |
| `name` | 工具展示名。 |
| `entry` | 插件入口类，格式为 `module:Class`。 |
| `summary` | 工具简介。 |
| `category` | 工具分类。 |
| `permissions` | 能力声明，例如 `clipboard`、`filesystem_write`、`power_control`。 |
| `ui.order` | 工具列表排序权重。 |
| `ui.show_state` | 通用面板是否展示插件状态，默认为展示。 |

### 5.3 自动注册流程

1. `ToolRegistry.discover()` 扫描 `plugins/builtin/*/manifest.json`。
2. 构建 `ToolManifest` 并校验 ID 唯一性。
3. 解析 `entry` 并动态导入插件类。
4. `ToolRuntime` 实例化插件并执行 `on_startup()`。
5. UI 通过 `getBootstrap()` 获取工具清单和状态。

### 5.4 自动注册与专用 UI 的边界

插件自动注册解决的是“工具能被发现和调用”。专用 UI 解决的是“工具是否有更好的使用体验”。

- 没有专用页面：进入通用插件面板，用户手动选择 action 并输入 JSON payload。
- 有专用页面：在 `index.html` 增加对应 `data-tool="<tool_id>"` 面板，并在前端模块中绑定专用交互。
- 无论是否有专用页面，插件的注册、状态导出、动作调用仍走同一套 bridge/runtime 协议。

## 6. 当前内置插件

| 工具 ID | 插件目录 | 是否有专用 UI | 说明 |
| --- | --- | --- | --- |
| `sleep_control` | `plugins/builtin/sleep_control` | 是 | 倒计时休眠与立即休眠。 |
| `batch_rename` | `plugins/builtin/batch_rename` | 是 | 文件批量重命名预览与执行。 |
| `clipboard_history` | `plugins/builtin/clipboard_history` | 是 | 文本剪贴板记录、回填、置顶、删除。 |
| `format_validator` | `plugins/builtin/format_validator` | 是 | JSON/YAML 格式化与校验。 |
| `keygen_tool` | `plugins/builtin/keygen_tool` | 是 | 密码、Token、UUID、文本/文件哈希。 |
| `time_converter` | `plugins/builtin/time_converter` | 是 | 时间戳与本地/UTC 时间互转。 |

可执行验证：

```powershell
uv run python scripts/list_builtin_plugins.py
```

## 7. 前后端协议

Bridge 对外接口：

| 接口 | 说明 |
| --- | --- |
| `getBootstrap()` | 返回 `app/tools/toolStates/loadErrors`。 |
| `invokeTool(tool_id, action, payload_json)` | 执行工具动作。 |
| `getSettings()` | 返回设置页所需的运行环境、路径、插件和日志摘要。 |
| `stateChanged(payload_json)` | 推送最新全量状态。 |
| `toastRaised(level, message)` | 非阻塞提示。 |

统一动作返回结构：

```json
{
  "ok": true,
  "code": "OK",
  "message": "操作成功",
  "toolId": "batch_rename",
  "action": "preview",
  "result": {
    "state": {}
  },
  "state": {}
}
```

失败返回结构：

```json
{
  "ok": false,
  "code": "ACTION_FAILED",
  "message": "目标目录不存在或不可访问",
  "error": "目标目录不存在或不可访问",
  "toolId": "batch_rename",
  "action": "preview"
}
```

`error` 字段保留用于兼容旧前端逻辑；新代码应优先读取 `message` 与 `code`。

## 8. 日志系统设计

日志路径：

| 项 | 路径 |
| --- | --- |
| 目录 | `<workspace>/.data/logs/` |
| 文件 | `events-YYYYMMDD.jsonl` |

日志类型：

| 类型 | 说明 |
| --- | --- |
| `runtime` | 启动、插件加载、状态事件。 |
| `audit` | 关键动作请求与执行。 |
| `error` | 失败与异常。 |

事件数据结构：

```json
{
  "ts": "2026-05-01T11:30:05+08:00",
  "level": "INFO",
  "log_type": "audit",
  "event": "action.executed",
  "tool_id": "keygen_tool",
  "action": "generate_password",
  "result": "ok",
  "trace_id": "uuid",
  "message": "tool action executed",
  "payload": {}
}
```

## 9. 当前边界

- 当前优先 Windows 桌面。
- 插件自动注册不等于自动生成专用 UI。
- 通用插件面板偏开发者向，不适合复杂工具的长期主路径。
- 运行产物、缓存和日志规则见 [WORKSPACE.md](WORKSPACE.md)。
- 已知限制见 [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)。
- 迭代计划见 [ROADMAP.md](ROADMAP.md)。
