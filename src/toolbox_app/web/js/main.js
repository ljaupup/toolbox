import { state } from "./state.js";
import { bindGlobalDropdownEvents, registerDropdown } from "./dropdown.js";
import {
  getToolState,
  openSettings,
  renderApp,
  renderGenericPane,
  renderToolNav,
  setToastHandler,
} from "./renderers.js";
import { bindBatchRename } from "./tools/batch_rename.js";
import { bindClipboardHistory } from "./tools/clipboard_history.js";
import { bindFormatValidator } from "./tools/format_validator.js";
import { bindGenericTool } from "./tools/generic_tool.js";
import { bindKeygenTool } from "./tools/keygen_tool.js";
import { bindSettings } from "./tools/settings.js";
import { bindSleepControl } from "./tools/sleep_control.js";
import { bindTimeConverter } from "./tools/time_converter.js";
import { byId, parsePayload, setStatus } from "./utils.js";

function showToast(level, message) {
  setStatus(message);
  const stack = byId("toast-stack");
  const toast = document.createElement("div");
  toast.className = `toast ${level}`;
  toast.textContent = message;
  stack.append(toast);
  window.setTimeout(() => toast.remove(), 2800);
}

function invokeTool(toolId, action, payload = {}) {
  return new Promise((resolve) => {
    if (!state.bridge?.invokeTool) {
      resolve({ ok: false, code: "BRIDGE_UNAVAILABLE", message: "bridge unavailable", error: "bridge unavailable" });
      return;
    }

    state.bridge.invokeTool(toolId, action, JSON.stringify(payload), (raw) => {
      try {
        resolve(parsePayload(raw));
      } catch {
        resolve({ ok: false, code: "INVALID_RESPONSE", message: "invalid invokeTool response", error: "invalid invokeTool response" });
      }
    });
  });
}

async function runAction(toolId, action, payload) {
  const result = await invokeTool(toolId, action, payload);
  if (!result.ok) {
    showToast("error", result.message || result.error || "操作失败");
  }
  return result;
}

async function copyToClipboard(text) {
  if (!text) {
    showToast("error", "没有可复制的内容");
    return;
  }
  const result = await runAction("clipboard_history", "set_clipboard", { text });
  if (result.ok) {
    showToast("success", "已复制到剪贴板");
  }
}

function getSettings() {
  return new Promise((resolve) => {
    if (!state.bridge?.getSettings) {
      resolve({ ok: true, data: getMockSettings() });
      return;
    }
    state.bridge.getSettings((raw) => {
      try {
        resolve({ ok: true, data: parsePayload(raw) });
      } catch {
        resolve({ ok: false, message: "设置页响应无效" });
      }
    });
  });
}

function bindUi() {
  registerDropdown("generic-action-dropdown", (value) => {
    if (!state.activeTool) {
      return;
    }
    state.generic.actionByTool[state.activeTool] = value || "";
  });

  bindGlobalDropdownEvents();
  bindGlobalControls();

  const context = {
    copyToClipboard,
    getSettings,
    getToolState,
    openSettings,
    renderGenericPane,
    runAction,
    showToast,
  };

  bindSleepControl(context);
  bindBatchRename(context);
  bindClipboardHistory(context);
  bindFormatValidator(context);
  bindKeygenTool(context);
  bindTimeConverter(context);
  bindGenericTool(context);
  bindSettings(context);
}

function bindGlobalControls() {
  byId("tool-search").addEventListener("input", (event) => {
    state.searchText = event.target.value || "";
    renderToolNav();
  });

  document.querySelectorAll("[data-copy-source]").forEach((node) => {
    node.addEventListener("click", async () => {
      const source = byId(node.dataset.copySource);
      await copyToClipboard(source?.value || "");
    });
  });
}

function getMockSettings() {
  const payload = state.payload || getMockPayload();
  return {
    app: {
      name: "自定义工具箱",
      python: "preview",
      platform: window.navigator.userAgent,
    },
    paths: {
      workspaceRoot: "未连接 Python bridge",
      dataDir: ".data",
      logDir: ".data/logs",
      qtWebEngineDir: ".qtwebengine",
    },
    uv: {
      UV_CACHE_DIR: "未连接 Python bridge",
      UV_TOOL_DIR: "未连接 Python bridge",
      UV_PYTHON_INSTALL_DIR: "未连接 Python bridge",
    },
    plugins: {
      count: payload.tools.length,
      items: payload.tools,
      loadErrors: payload.loadErrors || [],
    },
    logs: {
      fileCount: 0,
      totalBytes: 0,
      recent: [],
    },
  };
}

function applyPayload(payload) {
  renderApp(payload);
}

function getMockPayload() {
  return {
    app: {
      name: "自定义工具箱",
      tagline: "本地工具工作台",
    },
    tools: [
      { key: "sleep_control", title: "睡眠控制", summary: "倒计时休眠", actions: ["start_countdown", "cancel_plan", "sleep_now"] },
      { key: "batch_rename", title: "批量重命名", summary: "预览并重命名文件", actions: ["preview", "apply", "clear_preview"] },
      { key: "clipboard_history", title: "剪贴板历史", summary: "记录文本剪贴板", actions: ["clear", "remove_item", "set_clipboard", "toggle_pin"] },
      { key: "format_validator", title: "JSON/YAML 格式化", summary: "格式化与校验", actions: ["process", "clear"] },
      { key: "keygen_tool", title: "密码/密钥工具", summary: "生成密钥与哈希", actions: ["generate_password", "generate_token", "generate_uuid", "hash_text", "hash_file", "clear"] },
      { key: "time_converter", title: "时间戳转换", summary: "秒/毫秒时间戳与本地/UTC 时间互转", actions: ["now", "convert", "clear"] },
    ],
    toolStates: {
      sleep_control: { statusText: "未连接", targetTimeText: "未设定", logs: ["[preview] 未连接 Python bridge。"] },
      batch_rename: { statusText: "待命", preview: [] },
      clipboard_history: { statusText: "待命", items: [], total: 0 },
      format_validator: { message: "待命", output: "" },
      keygen_tool: { statusText: "待命" },
      time_converter: { statusText: "待命" },
    },
    loadErrors: [],
  };
}

function initBridge() {
  if (!window.qt?.webChannelTransport) {
    applyPayload(getMockPayload());
    return;
  }

  new QWebChannel(window.qt.webChannelTransport, (channel) => {
    state.bridge = channel.objects.toolboxBridge;

    state.bridge.stateChanged.connect((rawPayload) => {
      applyPayload(parsePayload(rawPayload));
    });

    state.bridge.toastRaised.connect((level, message) => {
      showToast(level, message);
    });

    state.bridge.getBootstrap((rawPayload) => {
      applyPayload(parsePayload(rawPayload));
    });
  });
}

setToastHandler(showToast);
bindUi();
byId("empty-workspace").classList.add("active");
initBridge();
