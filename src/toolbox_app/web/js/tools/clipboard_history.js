import { byId, createEmpty, escapeHtml, setStatus } from "../utils.js";

export function bindClipboardHistory({ getToolState, runAction }) {
  byId("clipboard-refresh").addEventListener("click", () => {
    renderClipboardHistory(getToolState("clipboard_history"));
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
}

export function renderClipboardHistory(data) {
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
