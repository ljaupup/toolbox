import { byId, escapeHtml } from "../utils.js";

export function bindBatchRename({ runAction }) {
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
}

export function renderBatchRename(data) {
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
