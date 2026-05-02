import { byId, createEmpty } from "../utils.js";

export function bindSleepControl({ runAction }) {
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
}

export function renderSleepControl(data) {
  byId("sleep-status-text").textContent = data.statusText || "未启动";
  byId("sleep-target-time-text").textContent = data.targetTimeText || "未设定";

  const host = byId("sleep-log-stream");
  host.innerHTML = "";
  const lines = (data.logs || []).slice().reverse();
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
