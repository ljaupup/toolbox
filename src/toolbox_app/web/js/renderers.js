import { state, TOOL_ICONS } from "./state.js";
import { byId, createEmpty, escapeHtml, setSegmentActive, setStatus } from "./utils.js";
import { setDropdownDisabled, setDropdownOptions, setDropdownValue } from "./dropdown.js";

let toastHandler = (_level, _message) => {};

export function setToastHandler(handler) {
  toastHandler = handler;
}

export function getTools() {
  return state.payload?.tools || [];
}

export function getTool(toolKey) {
  return getTools().find((item) => item.key === toolKey);
}

export function getDedicatedPane(toolKey) {
  return document.querySelector(`.tool-pane[data-tool="${toolKey}"]`);
}

export function getToolState(toolId) {
  return state.payload?.toolStates?.[toolId] || {};
}

function getFilteredTools() {
  const q = state.searchText.trim().toLowerCase();
  if (!q) {
    return getTools();
  }
  return getTools().filter((tool) => {
    const text = `${tool.title || ""} ${tool.summary || ""} ${tool.key || ""}`.toLowerCase();
    return text.includes(q);
  });
}

export function renderToolNav() {
  const host = byId("tool-nav");
  host.innerHTML = "";

  const tools = getFilteredTools();
  if (!tools.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的工具";
    host.append(empty);
    return;
  }

  for (const tool of tools) {
    const button = document.createElement("button");
    button.className = "tool-nav-item";
    button.type = "button";
    button.dataset.tool = tool.key;
    button.classList.toggle("active", tool.key === state.activeTool);
    button.innerHTML = `
      <span class="tool-icon">${TOOL_ICONS[tool.key] || "工"}</span>
      <span class="tool-name">${escapeHtml(tool.title || tool.key)}</span>
    `;
    button.addEventListener("click", () => openTool(tool.key));
    host.append(button);
  }
}

export function openTool(toolKey) {
  const tool = getTool(toolKey);
  if (!tool) {
    toastHandler("error", `未找到工具：${toolKey}`);
    return;
  }

  state.activeTool = toolKey;
  byId("empty-workspace").classList.remove("active");
  document.querySelectorAll(".tool-pane").forEach((pane) => pane.classList.remove("active"));

  const pane = getDedicatedPane(toolKey);
  if (pane) {
    pane.classList.add("active");
  } else {
    byId("generic-tool-pane").classList.add("active");
    renderGenericPane(toolKey);
  }

  renderToolNav();
  setStatus(`当前工具：${tool.title}`);
}

function ensureActiveTool() {
  const tools = getTools();
  if (!tools.length) {
    state.activeTool = null;
    byId("empty-workspace").classList.add("active");
    return;
  }
  if (!state.activeTool || !tools.some((tool) => tool.key === state.activeTool)) {
    state.activeTool = tools[0].key;
  }
  openTool(state.activeTool);
}

function renderSleep() {
  const sleep = getToolState("sleep_control");
  byId("sleep-status-text").textContent = sleep.statusText || "未启动";
  byId("sleep-target-time-text").textContent = sleep.targetTimeText || "未设定";

  const host = byId("sleep-log-stream");
  host.innerHTML = "";
  const lines = (sleep.logs || []).slice().reverse();
  if (!lines.length) {
    host.append(createEmpty("暂无日志"));
    return;
  }

  for (const line of lines) {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = line;
    host.append(entry);
  }
}

function renderBatchRename() {
  const data = getToolState("batch_rename");
  byId("rename-status").textContent = data.statusText || "待命";

  const body = byId("rename-preview-body");
  body.innerHTML = "";
  const rows = data.preview || [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="2">暂无预览内容</td>`;
    body.append(tr);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(row.source || "")}</td><td>${escapeHtml(row.target || "")}</td>`;
    body.append(tr);
  }
}

export function renderClipboard() {
  const data = getToolState("clipboard_history");
  byId("clipboard-status").textContent = data.statusText || "待命";

  const host = byId("clipboard-list");
  host.innerHTML = "";
  const items = data.items || [];
  if (!items.length) {
    host.append(createEmpty("还没有剪贴板记录"));
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "clip-item";
    row.innerHTML = `
      <div class="clip-item-head">
        <span>${escapeHtml(item.ts || "")}</span>
        <span class="badge">${item.pinned ? "置顶" : "普通"}</span>
      </div>
      <p class="clip-item-text">${escapeHtml(item.text || "")}</p>
      <div class="actions">
        <button class="btn small" type="button" data-clip-action="copy" data-id="${item.id}">回填</button>
        <button class="btn small" type="button" data-clip-action="pin" data-id="${item.id}">${item.pinned ? "取消置顶" : "置顶"}</button>
        <button class="btn small" type="button" data-clip-action="delete" data-id="${item.id}">删除</button>
      </div>
    `;
    host.append(row);
  }
}

function renderFormatValidator() {
  const data = getToolState("format_validator");
  byId("format-status").textContent = data.message || "待命";
  byId("format-output").value = data.output || "";

  if (data.lastMode) {
    state.ui.formatMode = data.lastMode;
  }
  if (data.lastOperation) {
    state.ui.formatOperation = data.lastOperation;
  }
  setSegmentActive("[data-format-mode]", state.ui.formatMode, "formatMode");
  setSegmentActive("[data-format-operation]", state.ui.formatOperation, "formatOperation");
}

export function renderKeygenMode() {
  document.querySelectorAll("[data-keygen-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.keygenPanel === state.ui.keygenMode);
  });
  const labelMap = {
    password: "生成密码",
    token: "生成 Token",
    uuid: "生成 UUID",
    hash: "计算哈希",
  };
  byId("keygen-run").textContent = labelMap[state.ui.keygenMode] || "生成";
}

function renderKeygen() {
  const data = getToolState("keygen_tool");
  byId("keygen-status").textContent = data.statusText || "待命";
  byId("keygen-password-output").value = data.lastPassword || "";
  byId("keygen-token-output").value = data.lastToken || "";
  byId("keygen-uuid-output").value = data.lastUuid || "";
  byId("keygen-hash-output").value = data.lastHash || "";
  setSegmentActive("[data-keygen-mode]", state.ui.keygenMode, "keygenMode");
  setSegmentActive("[data-hash-algorithm]", state.ui.hashAlgorithm, "hashAlgorithm");
  renderKeygenMode();
}

function renderTimeConverter() {
  const data = getToolState("time_converter");
  byId("time-status").textContent = data.statusText || "待命";

  if (data.lastMode) {
    state.ui.timeMode = data.lastMode;
  }
  if (data.lastTimestampUnit) {
    state.ui.timeTimestampUnit = data.lastTimestampUnit;
  }
  if (data.lastTimezone) {
    state.ui.timeTimezone = data.lastTimezone;
  }

  setDropdownValue("time-mode-dropdown", state.ui.timeMode, false);
  setDropdownValue("time-timestamp-unit-dropdown", state.ui.timeTimestampUnit, false);
  setDropdownValue("time-timezone-dropdown", state.ui.timeTimezone, false);

  if (document.activeElement !== byId("time-input")) {
    byId("time-input").value = data.inputValue || "";
  }

  byId("time-output-local").value = data.localIso || "";
  byId("time-output-utc").value = data.utcIso || "";
  byId("time-output-seconds").value = data.timestampSeconds || "";
  byId("time-output-milliseconds").value = data.timestampMilliseconds || "";
  byId("time-now-local").value = data.nowLocalIso || "";
  byId("time-now-utc").value = data.nowUtcIso || "";
  byId("time-now-seconds").value = data.nowTimestampSeconds || "";
  byId("time-now-milliseconds").value = data.nowTimestampMilliseconds || "";
}

export function renderGenericPane(toolKey) {
  const tool = getTool(toolKey);
  if (!tool) {
    return;
  }

  const toolState = getToolState(toolKey);
  const actions = Array.isArray(tool.actions) ? tool.actions : [];
  const runButton = byId("generic-run");
  const payloadInput = byId("generic-payload");
  const stateBlock = byId("generic-state-block");
  const showState = tool?.ui?.show_state !== false;

  byId("generic-tool-title").textContent = tool.title || tool.key;
  byId("generic-tool-summary").textContent = tool.summary || "当前插件没有专用页面，使用通用动作调用面板。";
  byId("generic-status").textContent = toolState.statusText || toolState.message || "待命";
  stateBlock.classList.toggle("hidden", !showState);
  byId("generic-state").value = showState ? JSON.stringify(toolState, null, 2) : "";
  byId("generic-result").value = state.generic.resultByTool[toolKey] || "";

  if (!actions.length) {
    setDropdownOptions("generic-action-dropdown", [{ value: "", label: "暂无可执行动作" }]);
    setDropdownDisabled("generic-action-dropdown", true);
    state.generic.actionByTool[toolKey] = "";
    runButton.disabled = true;
    if (document.activeElement !== payloadInput) {
      payloadInput.value = "{}";
    }
    return;
  }

  setDropdownDisabled("generic-action-dropdown", false);
  const actionOptions = actions.map((action) => ({ value: action, label: action }));
  setDropdownOptions("generic-action-dropdown", actionOptions);

  const selectedAction = actions.includes(state.generic.actionByTool[toolKey]) ? state.generic.actionByTool[toolKey] : actions[0];
  state.generic.actionByTool[toolKey] = selectedAction;
  setDropdownValue("generic-action-dropdown", selectedAction, false);
  runButton.disabled = false;

  if (!(toolKey in state.generic.payloadByTool)) {
    state.generic.payloadByTool[toolKey] = "{}";
  }
  if (document.activeElement !== payloadInput) {
    payloadInput.value = state.generic.payloadByTool[toolKey];
  }
}

export function renderApp(payload) {
  state.payload = payload;
  byId("brand-name").textContent = payload.app.name;
  byId("brand-tagline").textContent = "本地工具工作台";

  const errors = payload.loadErrors || [];
  byId("load-error-summary").textContent = errors.length ? `加载警告：${errors.length} 项` : "";

  renderToolNav();
  renderSleep();
  renderBatchRename();
  renderClipboard();
  renderFormatValidator();
  renderKeygen();
  renderTimeConverter();
  ensureActiveTool();

  if (state.activeTool && !getDedicatedPane(state.activeTool)) {
    renderGenericPane(state.activeTool);
  }
}
