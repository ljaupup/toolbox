export const state = {
  bridge: null,
  payload: null,
  activeTool: null,
  searchText: "",
  generic: {
    actionByTool: {},
    actionOptionsSignatureByTool: {},
    payloadByTool: {},
    resultByTool: {},
  },
  ui: {
    formatMode: "json",
    formatOperation: "format",
    hashAlgorithm: "sha256",
    keygenMode: "password",
    timeMode: "timestamp_to_datetime",
    timeTimestampUnit: "auto",
    timeTimezone: "local",
  },
};

export const TOOL_ICONS = {
  sleep_control: "眠",
  batch_rename: "名",
  clipboard_history: "剪",
  format_validator: "码",
  keygen_tool: "钥",
  time_converter: "时",
};

export const KEYGEN_OUTPUTS = {
  password: "keygen-password-output",
  token: "keygen-token-output",
  uuid: "keygen-uuid-output",
  hash: "keygen-hash-output",
};

export const dropdownChangeHandlers = new Map();
