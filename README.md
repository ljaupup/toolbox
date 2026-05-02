# 自定义工具箱

本地优先的 Python 桌面工具箱，用来把零散脚本能力沉淀为可复用的小工具。项目采用 `Python 能力层 + Qt WebEngine 宿主 + HTML/CSS/JS 界面层`，内置基于 `manifest.json` 的插件自动注册机制。

## 项目状态

- 当前阶段：早期开发版 `0.1.x`
- 优先平台：Windows
- 运行方式：桌面应用，不依赖远程服务
- 插件模式：启动时自动扫描内置插件目录并注册
- 许可证：MIT，见 [LICENSE](LICENSE)

## 核心文档

| 文档 | 说明 |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 项目架构、插件注册、前后端协议、日志系统 |
| [docs/APP_DESIGN.md](docs/APP_DESIGN.md) | 界面设计规范、工具页模板、内置工具设计 |
| [docs/WORKSPACE.md](docs/WORKSPACE.md) | 工作空间目录、缓存、运行产物和清理规则 |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | 当前限制和边界 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 已完成事项与后续计划 |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 应用宿主 | Python 3.11+、PySide6、Qt WebEngine、Qt WebChannel |
| 前端界面 | HTML、CSS、原生 JavaScript ES Modules |
| 插件系统 | `manifest.json` + Python 插件类自动发现 |
| 数据与日志 | 本地 JSONL、运行目录 `.data/` |
| 环境管理 | uv（推荐）或 venv + pip |
| 第三方依赖 | PyYAML |

## 快速开始

### 1. 安装 uv

Windows PowerShell：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

安装后重开终端并验证：

```powershell
uv --version
```

如果希望 uv 的缓存和 Python 安装目录不占用 C 盘，可按需设置全局环境变量：

```powershell
setx UV_CACHE_DIR E:\uv\cache
setx UV_TOOL_DIR E:\uv\tools
setx UV_PYTHON_INSTALL_DIR E:\uv\python
```

项目根目录提供 [uv.toml](uv.toml)，其中 `link-mode = "copy"` 用于避免 Windows 跨盘缓存时出现 hardlink warning。

### 2. 使用 uv 启动（推荐）

```powershell
uv sync
uv run python run.py
```

### 3. 不使用 uv 启动（venv + pip）

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -e .
python run.py
```

## 内置工具与使用说明

| 工具 ID | 功能 | 使用说明 |
| --- | --- | --- |
| `sleep_control` | 倒计时休眠 | 输入分钟数执行 `start_countdown`；可 `cancel_plan`；`sleep_now` 会触发前端二次确认。 |
| `batch_rename` | 批量重命名 | 输入目录、模板和起始序号，先 `preview` 再 `apply`；模板支持 `{index}`、`{name}`、`{ext}`、`{date}`、`{time}`。 |
| `clipboard_history` | 剪贴板历史 | 自动记录文本剪贴板，支持回填、置顶、删除和清空。 |
| `format_validator` | JSON/YAML 格式化与校验 | 选择格式和动作后执行 `process`；`clear` 可清空结果。 |
| `keygen_tool` | 密码/密钥工具 | 支持密码、Token、UUID 生成；哈希模式支持文本输入，也支持上传文件并计算哈希值。 |
| `time_converter` | 时间戳转换 | 支持秒/毫秒时间戳与本地/UTC 时间双向转换，`now` 可一键填充当前时间戳。 |

## 设置页

顶部“设置”按钮打开应用级状态页。当前设置页以只读状态中心为主，展示运行概览、本地目录、uv 环境变量、插件清单、加载错误和最近日志。

## 插件化扩展

说明：项目内部目录使用 `plugins`，表示具备 manifest、生命周期、权限声明和动作调用契约的可插拔模块；界面与用户文档中统一称为“工具”。

新增内置工具通常只需要新增插件目录，不需要修改核心工具列表：

```text
src/toolbox_app/plugins/builtin/<tool_id>/
  manifest.json
  plugin.py
  service.py        # 可选，复杂业务建议拆出
```

最小 `manifest.json`：

```json
{
  "id": "example_tool",
  "name": "示例工具",
  "entry": "toolbox_app.plugins.builtin.example_tool.plugin:ExampleToolPlugin",
  "summary": "示例工具说明。",
  "version": "0.1.0",
  "category": "developer",
  "permissions": [],
  "ui": {
    "order": 100,
    "default_visible": true
  }
}
```

启动时 `ToolRegistry` 会扫描 `plugins/builtin/*/manifest.json` 并加载插件。没有专用前端页面的插件会进入通用插件面板；需要更好的体验时，再补专用 UI。

可用以下命令验证自动注册结果：

```powershell
uv run python scripts/list_builtin_plugins.py
```

## 项目结构

```text
src/
  toolbox_app/
    assets/
      icons/
      branding/
    logging/
      core.py
    plugins/
      base.py
      registry.py
      runtime.py
      builtin/
        sleep_control/
        batch_rename/
        clipboard_history/
        format_validator/
        keygen_tool/
        time_converter/
    web/
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
    app.py
    bridge.py
    main.py
scripts/
  list_builtin_plugins.py
docs/
  ARCHITECTURE.md
  APP_DESIGN.md
  WORKSPACE.md
  KNOWN_LIMITATIONS.md
  ROADMAP.md
```

## 公开仓库建议

- 描述：`Local-first Python desktop toolbox with plugin-based tools and a lightweight Web UI.`
- Topics：`python`、`pyside6`、`qtwebengine`、`desktop-app`、`toolbox`、`plugins`、`automation`、`windows`
- 安装方式：优先展示 `uv sync` + `uv run python run.py`
- 限制说明：维护在 [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)
- 路线图：维护在 [docs/ROADMAP.md](docs/ROADMAP.md)
