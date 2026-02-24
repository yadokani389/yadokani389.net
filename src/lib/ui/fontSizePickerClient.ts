type FontSizePickerConfig = {
  fontSizeStorageKey: string;
  defaultFontSizeMode: string;
  fontSizeModes: string[];
};

const fontSizeConfigElementId = "font-size-picker-config";

export function readFontSizePickerConfig(): FontSizePickerConfig | null {
  const configNode = globalThis.document.getElementById(
    fontSizeConfigElementId,
  );
  if (!(configNode instanceof globalThis.HTMLScriptElement)) {
    return null;
  }

  try {
    return JSON.parse(configNode.textContent ?? "") as FontSizePickerConfig;
  } catch {
    return null;
  }
}

export function bootFontSizePicker(config: FontSizePickerConfig): void {
  const isValidMode = (mode: string | null): mode is string =>
    mode !== null && config.fontSizeModes.includes(mode);
  const fontSizePicker = globalThis.document.querySelector(
    "[data-font-size-picker]",
  );
  const currentLabel = globalThis.document.querySelector(
    "[data-font-size-current-label]",
  );
  const options = Array.from(
    globalThis.document.querySelectorAll("[data-font-size-value]"),
  );
  const labels = new Map(
    options
      .map((option) => {
        const mode = option.getAttribute("data-font-size-value");
        const label = option.getAttribute("data-font-size-label");
        if (!mode || !label) return null;
        return [mode, label];
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );

  const updatePickerState = (mode: string) => {
    const safeMode = isValidMode(mode) ? mode : config.defaultFontSizeMode;
    options.forEach((option) => {
      const optionMode = option.getAttribute("data-font-size-value");
      const isActive = optionMode === safeMode;
      option.classList.toggle("border-sage-500/40", isActive);
      option.classList.toggle("bg-sand-100", isActive);
      option.classList.toggle("text-ink-900", isActive);
      option.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (currentLabel instanceof globalThis.HTMLElement) {
      currentLabel.textContent = labels.get(safeMode) ?? safeMode;
    }
  };

  const getStoredMode = (): string => {
    try {
      const storedMode = globalThis.localStorage.getItem(
        config.fontSizeStorageKey,
      );
      return isValidMode(storedMode) ? storedMode : config.defaultFontSizeMode;
    } catch {
      return config.defaultFontSizeMode;
    }
  };

  const applyFontSizeMode = (mode: string, shouldPersist: boolean): void => {
    const safeMode = isValidMode(mode) ? mode : config.defaultFontSizeMode;

    globalThis.document.documentElement.dataset.fontSize = safeMode;
    updatePickerState(safeMode);

    if (shouldPersist) {
      try {
        globalThis.localStorage.setItem(config.fontSizeStorageKey, safeMode);
      } catch {
        return;
      }
    }
  };

  applyFontSizeMode(getStoredMode(), false);

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const mode = option.getAttribute("data-font-size-value");
      if (!mode) return;

      applyFontSizeMode(mode, true);
      if (fontSizePicker instanceof globalThis.HTMLDetailsElement) {
        fontSizePicker.open = false;
      }
    });
  });

  globalThis.document.addEventListener("click", (event) => {
    if (!(fontSizePicker instanceof globalThis.HTMLDetailsElement)) return;
    if (!fontSizePicker.open) return;

    const target = event.target;
    if (!(target instanceof globalThis.Node)) return;
    if (fontSizePicker.contains(target)) return;

    fontSizePicker.open = false;
  });
}
