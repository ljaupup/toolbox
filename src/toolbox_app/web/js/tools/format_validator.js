import { state } from "../state.js";
import { byId, setSegmentActive } from "../utils.js";

export function bindFormatValidator({ runAction }) {
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
}

export function renderFormatValidator(data) {
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
