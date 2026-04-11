# 已知限制

最后更新：2026-04-11

1. 当前以 Windows 为优先平台，`sleep_control` 依赖 Windows 电源命令。
2. 通用插件面板使用 JSON 手动输入 payload，偏开发者向，不适合非技术用户高频使用。
3. `clipboard_history` 仅记录文本剪贴板，不包含图片和文件对象。
4. `batch_rename` 目前只处理目录下第一层文件，不递归子目录。
5. 日志以本地 JSONL 存储，暂未提供内置日志清理策略和上限控制。
