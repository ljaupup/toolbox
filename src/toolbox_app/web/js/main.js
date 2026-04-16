import { KEYGEN_OUTPUTS, state } from "./state.js";
import {
  bindGlobalDropdownEvents,
  getDropdownValue,
  registerDropdown,
  setDropdownValue,
} from "./dropdown.js";
import {
  getToolState,
  renderApp,
  renderClipboard,
  renderGenericPane,
  renderKeygenMode,
  renderToolNav,
  setToastHandler,
} from "./renderers.js";
import { byId, parsePayload, setSegmentActive, setStatus } from "./utils.js";

const MAX_HASH_FILE_SIZE = 16 * 1024 * 1024;

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
      resolve({ ok: false, error: "bridge unavailable" });
      return;
    }

    state.bridge.invokeTool(toolId, action, JSON.stringify(payload), (raw) => {
      try {
        resolve(parsePayload(raw));
      } catch {
        resolve({ ok: false, error: "invalid invokeTool response" });
      }
    });
  });
}

async function runAction(toolId, action, payload) {
  const result = await invokeTool(toolId, action, payload);
  if (!result.ok) {
    showToast("error", result.error || "操作失败");
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

function formatBytes(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

async function readFileAsBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function bindUi() {
  registerDropdown("time-mode-dropdown", (value) => {
    state.ui.timeMode = value || "timestamp_to_datetime";
  });
  registerDropdown("time-timestamp-unit-dropdown", (value) => {
    state.ui.timeTimestampUnit = value || "auto";
  });
  registerDropdown("time-timezone-dropdown", (value) => {
    state.ui.timeTimezone = value || "local";
  });
  registerDropdown("generic-action-dropdown", (value) => {
    if (!state.activeTool) {
      return;
    }
    state.generic.actionByTool[state.activeTool] = value || "";
  });

  setDropdownValue("time-mode-dropdown", state.ui.timeMode, false);
  setDropdownValue("time-timestamp-unit-dropdown", state.ui.timeTimestampUnit, false);
  setDropdownValue("time-timezone-dropdown", state.ui.timeTimezone, false);
  bindGlobalDropdownEvents();

  byId("tool-search").addEventListener("input", (event) => {
    state.searchText = event.target.value || "";
    renderToolNav();
  });

  byId("settings-button").addEventListener("click", () => {
    showToast("info", "设置页待接入");
  });

  byId("sleep-start-plan").addEventListener("click", async () => {
    await runAction("sleep_control", "start_countdown", {
      minutes: Number.parseInt(byId("sleep-duration-minutes").value, 10) || 20,
    });
  });

  byId("sleep-cancel-plan").addEventListener("click", async () => {
    await runAction("sleep_control", "cancel_plan", {});
  });

  byId("sleep-now").addEventListener("click", async () => {
    if (window.confirm("这会立即尝试让电脑进入睡眠模式，是否继续？")) {
      await runAction("sleep_control", "sleep_now", {});
    }
  });

  byId("rename-preview").addEventListener("click", async () => {
    await runAction("batch_rename", "preview", {
      directory: byId("rename-directory").value,
      pattern: byId("rename-pattern").value,
      start_index: Number.parseInt(byId("rename-start-index").value, 10) || 1,
    });
  });

  byId("rename-apply").addEventListener("click", async () => {
    if (!window.confirm("将按当前预览规则重命名文件，是否继续？")) {
      return;
    }
    await runAction("batch_rename", "apply", {
      directory: byId("rename-directory").value,
      pattern: byId("rename-pattern").value,
      start_index: Number.parseInt(byId("rename-start-index").value, 10) || 1,
    });
  });

  byId("rename-clear").addEventListener("click", async () => {
    await runAction("batch_rename", "clear_preview", {});
  });

  byId("clipboard-refresh").addEventListener("click", () => {
    renderClipboard();
    setStatus("剪贴板历史已刷新");
  });

  byId("clipboard-clear").addEventListener("click", async () => {
    if (window.confirm("将清空剪贴板历史，是否继续？")) {
      await runAction("clipboard_history", "clear", {});
    }
  });

  byId("clipboard-list").addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.clipAction;
    const itemId = target.dataset.id;
    if (!action || !itemId) {
      return;
    }

    const items = getToolState("clipboard_history").items || [];
    const item = items.find((it) => it.id === itemId);
    if (action === "copy" && item) {
      await runAction("clipboard_history", "set_clipboard", { text: item.text });
      return;
    }
    if (action === "pin") {
      await runAction("clipboard_history", "toggle_pin", { id: itemId });
      return;
    }
    if (action === "delete" && window.confirm("删除这条剪贴板历史？")) {
      await runAction("clipboard_history", "remove_item", { id: itemId });
    }
  });

  document.querySelectorAll("[data-format-mode]").forEach((node) => {
    node.addEventListener("click", () => {
      state.ui.formatMode = node.dataset.formatMode || "json";
      setSegmentActive("[data-format-mode]", state.ui.formatMode, "formatMode");
    });
  });

  document.querySelectorAll("[data-format-operation]").forEach((node) => {
    node.addEventListener("click", () => {
      state.ui.formatOperation = node.dataset.formatOperation || "format";
      setSegmentActive("[data-format-operation]", state.ui.formatOperation, "formatOperation");
    });
  });

  byId("format-run").addEventListener("click", async () => {
    await runAction("format_validator", "process", {
      mode: state.ui.formatMode,
      operation: state.ui.formatOperation,
      indent: Number.parseInt(byId("format-indent").value, 10) || 2,
      text: byId("format-input").value,
    });
  });

  byId("format-clear").addEventListener("click", async () => {
    byId("format-input").value = "";
    await runAction("format_validator", "clear", {});
  });

  document.querySelectorAll("[data-keygen-mode]").forEach((node) => {
    node.addEventListener("click", () => {
      state.ui.keygenMode = node.dataset.keygenMode || "password";
      setSegmentActive("[data-keygen-mode]", state.ui.keygenMode, "keygenMode");
      renderKeygenMode();
    });
  });

  document.querySelectorAll("[data-hash-algorithm]").forEach((node) => {
    node.addEventListener("click", () => {
      state.ui.hashAlgorithm = node.dataset.hashAlgorithm || "sha256";
      setSegmentActive("[data-hash-algorithm]", state.ui.hashAlgorithm, "hashAlgorithm");
    });
  });

  byId("hash-file-input").addEventListener("change", () => {
    const file = byId("hash-file-input").files?.[0];
    if (!file) {
      byId("hash-file-meta").textContent = "未选择文件。若已选择文件，将优先计算文件哈希。";
      return;
    }
    byId("hash-file-meta").textContent = `已选择：${file.name}（${formatBytes(file.size)}）`;
  });

  byId("keygen-run").addEventListener("click", async () => {
    if (state.ui.keygenMode === "password") {
      await runAction("keygen_tool", "generate_password", {
        length: Number.parseInt(byId("pwd-length").value, 10) || 16,
        upper: byId("pwd-upper").checked,
        lower: byId("pwd-lower").checked,
        digits: byId("pwd-digits").checked,
        symbols: byId("pwd-symbols").checked,
        exclude_ambiguous: byId("pwd-exclude-ambiguous").checked,
      });
      return;
    }

    if (state.ui.keygenMode === "token") {
      await runAction("keygen_tool", "generate_token", { bytes: 32 });
      return;
    }

    if (state.ui.keygenMode === "uuid") {
      await runAction("keygen_tool", "generate_uuid", {});
      return;
    }

    const file = byId("hash-file-input").files?.[0];
    if (file) {
      if (file.size <= 0) {
        showToast("error", "文件为空，无法计算哈希");
        return;
      }
      if (file.size > MAX_HASH_FILE_SIZE) {
        showToast("error", `文件过大（>${formatBytes(MAX_HASH_FILE_SIZE)}），请先压缩或拆分`);
        return;
      }
      const contentB64 = await readFileAsBase64(file);
      await runAction("keygen_tool", "hash_file", {
        filename: file.name,
        size: file.size,
        content_b64: contentB64,
        algorithm: state.ui.hashAlgorithm,
      });
      return;
    }

    await runAction("keygen_tool", "hash_text", {
      text: byId("hash-input").value,
      algorithm: state.ui.hashAlgorithm,
    });
  });

  byId("keygen-clear").addEventListener("click", async () => {
    byId("hash-input").value = "";
    byId("hash-file-input").value = "";
    byId("hash-file-meta").textContent = "未选择文件。若已选择文件，将优先计算文件哈希。";
    await runAction("keygen_tool", "clear", {});
  });

  byId("keygen-copy-current").addEventListener("click", async () => {
    const source = byId(KEYGEN_OUTPUTS[state.ui.keygenMode]);
    await copyToClipboard(source?.value || "");
  });

  document.querySelectorAll("[data-copy-source]").forEach((node) => {
    node.addEventListener("click", async () => {
      const source = byId(node.dataset.copySource);
      await copyToClipboard(source?.value || "");
    });
  });

  byId("time-run").addEventListener("click", async () => {
    await runAction("time_converter", "convert", {
      mode: state.ui.timeMode,
      timestamp_unit: state.ui.timeTimestampUnit,
      timezone: state.ui.timeTimezone,
      value: byId("time-input").value,
    });
  });

  byId("time-now").addEventListener("click", async () => {
    const result = await runAction("time_converter", "now", {});
    if (!result.ok) {
      return;
    }
    const toolState = result?.result?.state || getToolState("time_converter");
    const fallback = toolState.nowTimestampSeconds || "";
    byId("time-input").value = fallback;
    if (!fallback) {
      return;
    }
    state.ui.timeMode = "timestamp_to_datetime";
    state.ui.timeTimestampUnit = "s";
    setDropdownValue("time-mode-dropdown", state.ui.timeMode, false);
    setDropdownValue("time-timestamp-unit-dropdown", state.ui.timeTimestampUnit, false);
  });

  byId("time-clear").addEventListener("click", async () => {
    byId("time-input").value = "";
    await runAction("time_converter", "clear", {});
  });

  byId("generic-payload").addEventListener("input", () => {
    if (!state.activeTool) {
      return;
    }
    state.generic.payloadByTool[state.activeTool] = byId("generic-payload").value;
  });

  byId("generic-run").addEventListener("click", async () => {
    const toolKey = state.activeTool;
    if (!toolKey) {
      return;
    }

    const action = state.generic.actionByTool[toolKey] || getDropdownValue("generic-action-dropdown");
    if (!action) {
      showToast("error", "当前工具没有可执行动作");
      return;
    }

    const rawPayload = byId("generic-payload").value.trim();
    let payload = {};
    if (rawPayload) {
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        showToast("error", "Payload 必须是合法 JSON");
        return;
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        showToast("error", "Payload 必须是 JSON 对象");
        return;
      }
    }

    state.generic.payloadByTool[toolKey] = rawPayload || "{}";
    const result = await runAction(toolKey, action, payload);
    state.generic.resultByTool[toolKey] = JSON.stringify(result, null, 2);
    renderGenericPane(toolKey);
  });

  byId("generic-clear").addEventListener("click", () => {
    const toolKey = state.activeTool;
    if (!toolKey) {
      return;
    }
    state.generic.resultByTool[toolKey] = "";
    byId("generic-result").value = "";
    setStatus("已清空调用返回");
  });
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
