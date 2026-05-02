import { state, TOOL_ICONS } from "./state.js";
import { setDropdownDisabled, setDropdownOptions, setDropdownValue } from "./dropdown.js";
import { renderBatchRename } from "./tools/batch_rename.js";
import { renderClipboardHistory } from "./tools/clipboard_history.js";
import { renderFormatValidator } from "./tools/format_validator.js";
import { renderKeygenTool } from "./tools/keygen_tool.js";
import { renderSleepControl } from "./tools/sleep_control.js";
import { renderTimeConverter } from "./tools/time_converter.js";
import { byId, escapeHtml, setStatus } from "./utils.js";

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

export function openSettings() {
  state.activeTool = "__settings__";
  byId("empty-workspace").classList.remove("active");
  document.querySelectorAll(".tool-pane").forEach((pane) => pane.classList.remove("active"));
  byId("settings-pane").classList.add("active");
  renderToolNav();
  setStatus("当前页面：设置");
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
  setDropdownOptions("generic-action-dropdown", actions.map((action) => ({ value: action, label: action })));

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
  renderToolPanes();
  ensureActiveTool();

  if (state.activeTool && !getDedicatedPane(state.activeTool)) {
    renderGenericPane(state.activeTool);
  }
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

function ensureActiveTool() {
  if (state.activeTool === "__settings__") {
    openSettings();
    return;
  }

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

function renderToolPanes() {
  renderSleepControl(getToolState("sleep_control"));
  renderBatchRename(getToolState("batch_rename"));
  renderClipboardHistory(getToolState("clipboard_history"));
  renderFormatValidator(getToolState("format_validator"));
  renderKeygenTool(getToolState("keygen_tool"));
  renderTimeConverter(getToolState("time_converter"));
}
