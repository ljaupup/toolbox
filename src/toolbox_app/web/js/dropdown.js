import { dropdownChangeHandlers } from "./state.js";
import { byId } from "./utils.js";

export function getDropdownParts(dropdownId) {
  const root = byId(dropdownId);
  if (!root) {
    return null;
  }
  const trigger = root.querySelector("[data-dropdown-trigger]");
  const menu = root.querySelector("[data-dropdown-menu]");
  if (!(trigger instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) {
    return null;
  }
  return { root, trigger, menu };
}

export function closeDropdown(dropdownId) {
  const parts = getDropdownParts(dropdownId);
  if (!parts) {
    return;
  }
  parts.menu.classList.add("hidden");
  parts.trigger.setAttribute("aria-expanded", "false");
}

export function closeAllDropdowns(exceptId = "") {
  document.querySelectorAll("[data-dropdown]").forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    if (exceptId && node.id === exceptId) {
      return;
    }
    closeDropdown(node.id);
  });
}

export function openDropdown(dropdownId) {
  const parts = getDropdownParts(dropdownId);
  if (!parts || parts.trigger.disabled) {
    return;
  }
  closeAllDropdowns(dropdownId);
  parts.menu.classList.remove("hidden");
  parts.trigger.setAttribute("aria-expanded", "true");
}

export function getDropdownValue(dropdownId) {
  const parts = getDropdownParts(dropdownId);
  if (!parts) {
    return "";
  }
  return parts.root.dataset.value || "";
}

export function setDropdownValue(dropdownId, value, emit = false) {
  const parts = getDropdownParts(dropdownId);
  if (!parts) {
    return;
  }

  const options = Array.from(parts.menu.querySelectorAll("[data-dropdown-option]"));
  const selectedOption = options.find((node) => node instanceof HTMLElement && node.dataset.value === value) || options[0];

  if (!(selectedOption instanceof HTMLElement)) {
    parts.root.dataset.value = "";
    parts.trigger.textContent = "";
    return;
  }

  const nextValue = selectedOption.dataset.value || "";
  parts.root.dataset.value = nextValue;
  parts.trigger.textContent = selectedOption.textContent || "";

  options.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    node.classList.toggle("active", node === selectedOption);
  });

  if (emit) {
    const handler = dropdownChangeHandlers.get(dropdownId);
    if (handler) {
      handler(nextValue);
    }
  }
}

export function setDropdownOptions(dropdownId, options) {
  const parts = getDropdownParts(dropdownId);
  if (!parts) {
    return;
  }

  const signature = options.map((item) => `${item.value}:${item.label}`).join("|");
  if (parts.root.dataset.signature === signature) {
    return;
  }
  parts.root.dataset.signature = signature;

  parts.menu.innerHTML = "";
  for (const item of options) {
    const option = document.createElement("button");
    option.className = "dropdown-option";
    option.type = "button";
    option.dataset.dropdownOption = "";
    option.dataset.value = item.value;
    option.textContent = item.label;
    parts.menu.append(option);
  }

  const current = getDropdownValue(dropdownId);
  const fallback = options[0]?.value || "";
  const value = options.some((item) => item.value === current) ? current : fallback;
  setDropdownValue(dropdownId, value, false);
}

export function setDropdownDisabled(dropdownId, disabled) {
  const parts = getDropdownParts(dropdownId);
  if (!parts) {
    return;
  }
  parts.trigger.disabled = Boolean(disabled);
  if (disabled) {
    closeDropdown(dropdownId);
  }
}

export function registerDropdown(dropdownId, onChange) {
  dropdownChangeHandlers.set(dropdownId, onChange);
  const parts = getDropdownParts(dropdownId);
  if (!parts) {
    return;
  }

  parts.trigger.addEventListener("click", () => {
    const isOpen = !parts.menu.classList.contains("hidden");
    if (isOpen) {
      closeDropdown(dropdownId);
    } else {
      openDropdown(dropdownId);
    }
  });

  parts.menu.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const option = target.closest("[data-dropdown-option]");
    if (!(option instanceof HTMLElement)) {
      return;
    }
    const value = option.dataset.value || "";
    setDropdownValue(dropdownId, value, true);
    closeDropdown(dropdownId);
  });
}

export function bindGlobalDropdownEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.closest("[data-dropdown]")) {
      return;
    }
    closeAllDropdowns();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllDropdowns();
    }
  });
}
