import { state } from "../state.js";
import { byId, createEmpty, escapeHtml, setStatus } from "../utils.js";

export function bindSettings({ getSettings, openSettings, showToast }) {
  byId("settings-button").addEventListener("click", async () => {
    await refreshSettings({ getSettings, openSettings, showToast });
  });

  byId("settings-refresh").addEventListener("click", async () => {
    await refreshSettings({ getSettings, openSettings, showToast });
  });
}

export function renderSettings(data = state.settings) {
  if (!data) {
    byId("settings-summary").innerHTML = "";
    byId("settings-paths").innerHTML = "";
    byId("settings-uv").innerHTML = "";
    byId("settings-plugins").innerHTML = "";
    byId("settings-load-errors").innerHTML = "";
    byId("settings-recent-logs").innerHTML = "";
    return;
  }

  renderKeyValues("settings-summary", [
    ["应用", data.app?.name || "自定义工具箱"],
    ["Python", data.app?.python || "-"],
    ["系统", data.app?.platform || "-"],
    ["插件数量", String(data.plugins?.count ?? 0)],
    ["日志文件", `${data.logs?.fileCount ?? 0} 个 / ${formatBytes(data.logs?.totalBytes || 0)}`],
  ]);

  renderKeyValues("settings-paths", [
    ["工作空间", data.paths?.workspaceRoot || "-"],
    ["运行数据", data.paths?.dataDir || "-"],
    ["日志目录", data.paths?.logDir || "-"],
    ["Qt WebEngine", data.paths?.qtWebEngineDir || "-"],
  ]);

  renderKeyValues("settings-uv", [
    ["UV_CACHE_DIR", data.uv?.UV_CACHE_DIR || "未设置"],
    ["UV_TOOL_DIR", data.uv?.UV_TOOL_DIR || "未设置"],
    ["UV_PYTHON_INSTALL_DIR", data.uv?.UV_PYTHON_INSTALL_DIR || "未设置"],
  ]);

  renderPlugins(data.plugins?.items || []);
  renderLoadErrors(data.plugins?.loadErrors || []);
  renderRecentLogs(data.logs?.recent || []);
}

async function refreshSettings({ getSettings, openSettings, showToast }) {
  const result = await getSettings();
  if (!result.ok) {
    showToast("error", result.message || "设置页加载失败");
    return;
  }
  state.settings = result.data;
  openSettings();
  renderSettings(state.settings);
  setStatus("设置页已刷新");
}

function renderKeyValues(hostId, rows) {
  const host = byId(hostId);
  host.innerHTML = "";
  for (const [key, value] of rows) {
    const row = document.createElement("div");
    row.className = "kv-row";
    row.innerHTML = `<span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong>`;
    host.append(row);
  }
}

function renderPlugins(items) {
  const host = byId("settings-plugins");
  host.innerHTML = "";
  if (!items.length) {
    host.append(createEmpty("暂无插件"));
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "settings-plugin-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.title || item.key)}</strong>
        <p>${escapeHtml(item.summary || "")}</p>
      </div>
      <span>${escapeHtml(item.key || "")}</span>
    `;
    host.append(row);
  }
}

function renderLoadErrors(errors) {
  const host = byId("settings-load-errors");
  host.innerHTML = "";
  if (!errors.length) {
    host.append(createEmpty("无加载错误"));
    return;
  }
  for (const error of errors) {
    const row = document.createElement("div");
    row.className = "log-entry";
    row.textContent = error;
    host.append(row);
  }
}

function renderRecentLogs(items) {
  const host = byId("settings-recent-logs");
  host.innerHTML = "";
  if (!items.length) {
    host.append(createEmpty("暂无日志"));
    return;
  }
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "log-entry";
    row.textContent = `[${item.level || "-"}] ${item.ts || ""} ${item.event || ""} ${item.message || ""}`;
    host.append(row);
  }
}

function formatBytes(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
