# 工作空间规范

最后更新：2026-05-01

本文档说明项目根目录中哪些内容应提交到 Git，哪些是本地运行产物，以及常见缓存的清理规则。

## 应提交到 Git 的内容

| 路径 | 说明 |
| --- | --- |
| `src/` | 应用源码、插件、前端资源和运行时资产。 |
| `docs/` | 项目文档。 |
| `scripts/` | 开发辅助脚本。 |
| `README.md` | 项目入口说明。 |
| `LICENSE` | 开源许可证。 |
| `pyproject.toml` | Python 项目配置和依赖声明。 |
| `uv.lock` | uv 锁定文件，建议提交，保证依赖可复现。 |
| `uv.toml` | 项目级 uv 配置，当前用于设置 `link-mode = "copy"`。 |
| `.python-version` | Python 版本提示。 |
| `.gitignore` | 本地产物忽略规则。 |

说明：前端模块位于 `src/toolbox_app/web/js/`，内置工具专用逻辑位于 `src/toolbox_app/web/js/tools/`。新增前端子目录后，需要同步检查 `pyproject.toml` 的 `toolbox_app` package data，避免打包时漏掉静态资源。

## 不应提交到 Git 的内容

| 路径 | 说明 | 是否可删除 |
| --- | --- | --- |
| `.venv/` | 本地虚拟环境。 | 可删除，之后用 `uv sync` 或 venv 重建。 |
| `.uv-cache/` | 项目内 uv 缓存；当前建议使用全局 `E:\uv\cache`。 | 可删除。 |
| `.data/` | 本地运行数据和日志。 | 可删除，但会丢失本地日志和运行状态。 |
| `.qtwebengine/` | Qt WebEngine 运行缓存。 | 可删除，启动后会重建。 |
| `__pycache__/` | Python 字节码缓存。 | 可删除。 |
| `*.egg-info/` | `pip install -e .` 或构建过程生成的包元数据。 | 可删除，安装/构建时会重建。 |
| `.pytest_cache/`、`.ruff_cache/` 等 | 工具缓存。 | 可删除。 |

## uv 目录建议

如果希望 uv 相关缓存不占用 C 盘，可使用全局环境变量：

```powershell
setx UV_CACHE_DIR E:\uv\cache
setx UV_TOOL_DIR E:\uv\tools
setx UV_PYTHON_INSTALL_DIR E:\uv\python
```

设置后重开终端，用以下命令确认：

```powershell
uv cache dir
$env:UV_CACHE_DIR
$env:UV_TOOL_DIR
$env:UV_PYTHON_INSTALL_DIR
```

项目内 [uv.toml](../uv.toml) 保留 `link-mode = "copy"`，用于避免 Windows 跨盘 hardlink warning。

## 本地清理建议

常规清理目标：

```text
__pycache__/
*.egg-info/
.pytest_cache/
.ruff_cache/
.qtwebengine/
.uv-cache/
```

谨慎清理目标：

```text
.data/
.venv/
```

说明：

- 删除 `.data/` 会清掉本地日志和运行状态。
- 删除 `.venv/` 后需要重新安装依赖。
- 删除 `.qtwebengine/` 通常安全，应用下次启动会重建。
- 删除 `.uv-cache/` 通常安全，但如果仍有命令使用项目内缓存，下次安装会重新下载。

## 未跟踪临时文件

当前若出现 `todo.md` 这类未跟踪文件，应先判断内容是否属于长期文档：

- 属于产品计划：合并到 [ROADMAP.md](ROADMAP.md)。
- 属于工作空间说明：合并到本文档。
- 属于一次性草稿：保留本地或手动删除，不提交。

当前 `todo.md` 中关于 React/Vue 的想法已被吸收到 [ROADMAP.md](ROADMAP.md) 的“中期”评估项。
