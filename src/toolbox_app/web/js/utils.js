export function byId(id) {
  return document.getElementById(id);
}

export function parsePayload(raw) {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export function createEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function setStatus(message) {
  byId("status-message").textContent = message || "就绪";
}

export function setSegmentActive(selector, value, dataKey) {
  document.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset[dataKey] === value);
  });
}
