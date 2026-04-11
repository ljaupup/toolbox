const state = {
  bridge: null,
  payload: null,
  activeTool: null,
  searchText: "",
  ui: {
    formatMode: "json",
    formatOperation: "format",
    hashAlgorithm: "sha256",
    keygenMode: "password",
  },
};

const TOOL_ICONS = {
  sleep_control: "眠",
  batch_rename: "名",
  clipboard_history: "剪",
  format_validator: "码",
  keygen_tool: "钥",
};

const KEYGEN_OUTPUTS = {
  password: "keygen-password-output",
  token: "keygen-token-output",
  uuid: "keygen-uuid-output",
  hash: "keygen-hash-output",
};

function byId(id) {
  return document.getElementById(id);
}

function parsePayload(raw) {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function getTools() {
  return state.payload?.tools || [];
}

function getToolState(toolId) {
  return state.payload?.toolStates?.[toolId] || {};
}

function setStatus(message) {
  byId("status-message").textContent = message || "就绪";
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

function renderToolNav() {
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

function openTool(toolKey) {
  const tool = getTools().find((item) => item.key === toolKey);
  if (!tool) {
    showToast("error", `未找到工具：${toolKey}`);
    return;
  }

  state.activeTool = toolKey;
  byId("empty-workspace").classList.remove("active");
  document.querySelectorAll(".tool-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.dataset.tool === toolKey);
  });
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

function renderClipboard() {
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

function setSegmentActive(selector, value, dataKey) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset[dataKey] === value);
  });
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

function renderKeygenMode() {
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

function renderApp(payload) {
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
  ensureActiveTool();
}

function createEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

function bindUi() {
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

    await runAction("keygen_tool", "hash_text", {
      text: byId("hash-input").value,
      algorithm: state.ui.hashAlgorithm,
    });
  });

  byId("keygen-clear").addEventListener("click", async () => {
    byId("hash-input").value = "";
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
}

function initBridge() {
  if (!window.qt?.webChannelTransport) {
    renderApp({
      app: {
        name: "自定义工具箱",
        tagline: "本地工具工作台",
      },
      tools: [
        { key: "sleep_control", title: "睡眠控制", summary: "倒计时休眠" },
        { key: "batch_rename", title: "批量重命名", summary: "预览并重命名文件" },
        { key: "clipboard_history", title: "剪贴板历史", summary: "记录文本剪贴板" },
        { key: "format_validator", title: "JSON/YAML 格式化", summary: "格式化与校验" },
        { key: "keygen_tool", title: "密码/密钥工具", summary: "生成密钥与哈希" },
      ],
      toolStates: {
        sleep_control: { statusText: "未连接", targetTimeText: "未设定", logs: ["[preview] 未连接 Python bridge。"] },
        batch_rename: { statusText: "待命", preview: [] },
        clipboard_history: { statusText: "待命", items: [], total: 0 },
        format_validator: { message: "待命", output: "" },
        keygen_tool: { statusText: "待命" },
      },
      loadErrors: [],
    });
    return;
  }

  new QWebChannel(window.qt.webChannelTransport, (channel) => {
    state.bridge = channel.objects.toolboxBridge;

    state.bridge.stateChanged.connect((rawPayload) => {
      renderApp(parsePayload(rawPayload));
    });

    state.bridge.toastRaised.connect((level, message) => {
      showToast(level, message);
    });

    state.bridge.getBootstrap((rawPayload) => {
      renderApp(parsePayload(rawPayload));
    });
  });
}

bindUi();
byId("empty-workspace").classList.add("active");
initBridge();
