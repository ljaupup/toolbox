# 自定义工具箱

一个本地优先的 Python 桌面工具箱，采用 `Python 能力层 + HTML/CSS/JS 界面层`，并提供基于 `manifest` 的插件自动注册。

## 核心文档

- 架构文档：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 设计文档：[docs/APP_DESIGN.md](docs/APP_DESIGN.md)
- 已知限制：[docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)
- 路线图：[docs/ROADMAP.md](docs/ROADMAP.md)

## 技术栈

- Python 3.11+
- PySide6 + Qt WebEngine + Qt WebChannel
- HTML / CSS / JavaScript
- uv（推荐）或 venv + pip
- PyYAML

## 快速开始

### 0. 安装 uv（不要省略）

Windows PowerShell：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

安装后重开终端并验证：

```powershell
uv --version
```

### 方式 A：使用 uv（推荐）

```powershell
uv sync
uv run python run.py
```

### 方式 B：不用 uv（venv + pip）

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -e .
python run.py
```

说明：项目根目录提供 `uv.toml`，默认 `link-mode = "copy"`，用于避免 Windows 跨盘缓存导致的 hardlink warning；缓存目录由你的全局 `UV_CACHE_DIR` 决定。

## 内置工具与使用说明

| 工具 ID               | 功能                   | 使用说明                                                                                                                     |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `sleep_control`     | 倒计时休眠             | 输入分钟数执行 `start_countdown`；可 `cancel_plan`；`sleep_now` 为高风险动作，前端会二次确认。                         |
| `batch_rename`      | 批量重命名             | 输入目录、模板和起始序号，先 `preview` 再 `apply`；模板支持 `{index}`、`{name}`、`{ext}`、`{date}`、`{time}`。 |
| `clipboard_history` | 剪贴板历史             | 自动记录文本剪贴板；支持回填、置顶、删除、清空。                                                                             |
| `format_validator`  | JSON/YAML 格式化与校验 | 选择格式和动作后执行 `process`；`clear` 可清空结果。                                                                     |
| `keygen_tool`       | 密码/密钥工具          | 支持密码、Token、UUID 生成；哈希模式支持文本输入，也支持上传文件并计算哈希值。                                               |
| `time_converter`    | 时间戳转换             | 支持秒/毫秒时间戳与本地/UTC 时间双向转换，`now` 可一键填充当前时间戳。                                                 |

## 插件化扩展（自动注册）

新增工具默认不需要修改核心工具列表，只要新增插件目录：

```text
src/toolbox_app/plugins/builtin/<tool_id>/
  manifest.json
  plugin.py
```

启动时会自动扫描 `plugins/builtin/*/manifest.json` 并加载。
对于没有专用前端页面的插件，应用会自动落到“通用插件面板”执行动作。

可用以下命令验证自动注册结果：

```powershell
uv run python scripts/list_builtin_plugins.py
```

## 项目结构

```text
src/
  toolbox_app/
    logging/
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
    app.py
    bridge.py
    main.py
scripts/
  list_builtin_plugins.py
docs/
  ARCHITECTURE.md
  APP_DESIGN.md
  KNOWN_LIMITATIONS.md
  ROADMAP.md
```
