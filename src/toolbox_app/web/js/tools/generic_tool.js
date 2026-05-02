import { state } from "../state.js";
import { getDropdownValue } from "../dropdown.js";
import { byId, setStatus } from "../utils.js";

export function bindGenericTool({ renderGenericPane, runAction, showToast }) {
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
