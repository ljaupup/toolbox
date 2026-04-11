# 自定义工具箱

一个基于 Python 的桌面工具箱，采用“Python 能力层 + HTML/CSS/JS 界面层”架构。

## 核心文档

- 架构说明：`docs/ARCHITECTURE.md`

## 技术栈

- Python 3.11+
- uv（依赖与虚拟环境管理）
- PySide6 + Qt WebEngine + Qt WebChannel
- HTML / CSS / JavaScript
- PyYAML（JSON/YAML 工具）

## 内置工具与使用说明

| 工具                  | 功能                        | 使用说明                                                                                                                                 |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `sleep_control`     | 倒计时休眠                  | 输入倒计时分钟数后开始计划；可取消计划；“立即休眠”属于高风险操作，会二次确认。                                                         |
| `batch_rename`      | 批量重命名                  | 输入目录、命名模板和起始序号；模板支持 `{index}`、`{name}`、`{ext}`、`{date}`、`{time}`；先预览，确认后再执行重命名。          |
| `clipboard_history` | 剪贴板历史                  | 工具启动后自动记录文本剪贴板；每条记录支持回填、置顶、删除；支持一键清空历史。                                                           |
| `format_validator`  | JSON/YAML 格式化与校验      | 选择 `JSON` 或 `YAML`，再选择“格式化”或“校验”；格式化结果可复制，校验失败会在状态区反馈错误。                                    |
| `keygen_tool`       | 密码、Token、UUID、文本哈希 | 选择生成模式；密码支持字符集配置；Token 和 UUID 可直接生成；哈希支持 `md5`、`sha1`、`sha256`、`sha512`；结果可复制到系统剪贴板。 |

## 快速开始

本项目使用 `uv` 管理 Python 环境和依赖。第一次使用时按下面步骤操作。

### 1. 安装 uv

如果电脑上还没有 `uv`，在 PowerShell 中执行：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

安装完成后，重新打开 PowerShell，并确认安装成功：

```powershell
uv --version
```

### 2. 进入项目目录

```powershell
cd D:\Desktop\toolbox
```

### 3. 安装依赖

`uv sync` 会根据 `pyproject.toml` 和 `uv.lock` 自动创建 `.venv` 并安装依赖：

```powershell
uv sync
```

### 4. 启动应用

```powershell
uv run python run.py
```

说明：项目根目录包含 `uv.toml`，已将 `link-mode` 固定为 `copy`，用于避免 Windows 下缓存目录与项目目录不在同一磁盘时出现 hardlink 警告。

## 插件化扩展（自动注册）

新增工具无需修改核心列表，只需新增目录：

```text
src/toolbox_app/plugins/builtin/<tool_id>/
  manifest.json
  plugin.py
```

系统会在启动时自动扫描 `plugins/builtin/*/manifest.json` 并加载。

## 项目结构

```text
src/
  toolbox_app/
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
    web/
      index.html
      app.css
      app.js
    app.py
    bridge.py
    main.py
docs/
  ARCHITECTURE.md
run.py
pyproject.toml
uv.lock
```
