import { KEYGEN_OUTPUTS, state } from "../state.js";
import { byId, setSegmentActive } from "../utils.js";

const MAX_HASH_FILE_SIZE = 16 * 1024 * 1024;
const HASH_FILE_EMPTY_TEXT = "未选择文件。若已选择文件，将优先计算文件哈希。";

export function bindKeygenTool({ copyToClipboard, runAction, showToast }) {
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
    byId("hash-file-meta").textContent = file ? `已选择：${file.name}（${formatBytes(file.size)}）` : HASH_FILE_EMPTY_TEXT;
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

    await runHashAction({ runAction, showToast });
  });

  byId("keygen-clear").addEventListener("click", async () => {
    byId("hash-input").value = "";
    byId("hash-file-input").value = "";
    byId("hash-file-meta").textContent = HASH_FILE_EMPTY_TEXT;
    await runAction("keygen_tool", "clear", {});
  });

  byId("keygen-copy-current").addEventListener("click", async () => {
    const source = byId(KEYGEN_OUTPUTS[state.ui.keygenMode]);
    await copyToClipboard(source?.value || "");
  });
}

export function renderKeygenTool(data) {
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

async function runHashAction({ runAction, showToast }) {
  const file = byId("hash-file-input").files?.[0];
  if (!file) {
    await runAction("keygen_tool", "hash_text", {
      text: byId("hash-input").value,
      algorithm: state.ui.hashAlgorithm,
    });
    return;
  }

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
