import { state } from "../state.js";
import { registerDropdown, setDropdownValue } from "../dropdown.js";
import { byId } from "../utils.js";

export function bindTimeConverter({ getToolState, runAction }) {
  registerDropdown("time-mode-dropdown", (value) => {
    state.ui.timeMode = value || "timestamp_to_datetime";
  });
  registerDropdown("time-timestamp-unit-dropdown", (value) => {
    state.ui.timeTimestampUnit = value || "auto";
  });
  registerDropdown("time-timezone-dropdown", (value) => {
    state.ui.timeTimezone = value || "local";
  });

  setDropdownValue("time-mode-dropdown", state.ui.timeMode, false);
  setDropdownValue("time-timestamp-unit-dropdown", state.ui.timeTimestampUnit, false);
  setDropdownValue("time-timezone-dropdown", state.ui.timeTimezone, false);

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
}

export function renderTimeConverter(data) {
  byId("time-status").textContent = data.statusText || "待命";

  if (data.lastMode) {
    state.ui.timeMode = data.lastMode;
  }
  if (data.lastTimestampUnit) {
    state.ui.timeTimestampUnit = data.lastTimestampUnit;
  }
  if (data.lastTimezone) {
    state.ui.timeTimezone = data.lastTimezone;
  }

  setDropdownValue("time-mode-dropdown", state.ui.timeMode, false);
  setDropdownValue("time-timestamp-unit-dropdown", state.ui.timeTimestampUnit, false);
  setDropdownValue("time-timezone-dropdown", state.ui.timeTimezone, false);

  if (document.activeElement !== byId("time-input")) {
    byId("time-input").value = data.inputValue || "";
  }

  byId("time-output-local").value = data.localIso || "";
  byId("time-output-utc").value = data.utcIso || "";
  byId("time-output-seconds").value = data.timestampSeconds || "";
  byId("time-output-milliseconds").value = data.timestampMilliseconds || "";
  byId("time-now-local").value = data.nowLocalIso || "";
  byId("time-now-utc").value = data.nowUtcIso || "";
  byId("time-now-seconds").value = data.nowTimestampSeconds || "";
  byId("time-now-milliseconds").value = data.nowTimestampMilliseconds || "";
}
