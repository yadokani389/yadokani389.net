type ThemePickerConfig = {
  daisyThemes: string[];
  darkThemeModes: string[];
  themeStorageKey: string;
  defaultThemeMode: string;
};

const themeConfigElementId = "theme-picker-config";

function resolveTheme(mode: string, prefersDark: boolean): string {
  return mode === "system" ? (prefersDark ? "dark" : "light") : mode;
}

export function readThemePickerConfig(): ThemePickerConfig | null {
  const configNode = globalThis.document.getElementById(themeConfigElementId);
  if (!(configNode instanceof globalThis.HTMLScriptElement)) {
    return null;
  }

  try {
    return JSON.parse(configNode.textContent ?? "") as ThemePickerConfig;
  } catch {
    return null;
  }
}

export function bootThemePicker(config: ThemePickerConfig): void {
  const isValidMode = (mode: string | null): mode is string =>
    mode === "system" || (mode !== null && config.daisyThemes.includes(mode));
  const themeMediaQuery = globalThis.window.matchMedia(
    "(prefers-color-scheme: dark)",
  );
  const themePicker = globalThis.document.querySelector("[data-theme-picker]");
  const themeCurrentLabel = globalThis.document.querySelector(
    "[data-theme-current-label]",
  );
  const themeCurrentChips = {
    base: globalThis.document.querySelector('[data-theme-current-chip="base"]'),
    primary: globalThis.document.querySelector(
      '[data-theme-current-chip="primary"]',
    ),
    secondary: globalThis.document.querySelector(
      '[data-theme-current-chip="secondary"]',
    ),
  };
  const themeOptions = Array.from(
    globalThis.document.querySelectorAll("[data-theme-value]"),
  );
  const themeLabels = new Map(
    themeOptions
      .map((option) => {
        const mode = option.getAttribute("data-theme-value");
        const label = option.getAttribute("data-theme-label");
        if (!mode || !label) return null;
        return [mode, label];
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );

  const previewProbe = globalThis.document.createElement("div");
  previewProbe.setAttribute("aria-hidden", "true");
  previewProbe.style.position = "fixed";
  previewProbe.style.opacity = "0";
  previewProbe.style.pointerEvents = "none";
  previewProbe.style.left = "-9999px";
  previewProbe.style.top = "-9999px";
  globalThis.document.body.append(previewProbe);

  const detectColorScheme = (mode: string): "dark" | "light" => {
    if (mode === "system") {
      return themeMediaQuery.matches ? "dark" : "light";
    }

    const cssColorScheme = globalThis.getComputedStyle(
      globalThis.document.documentElement,
    ).colorScheme;
    if (cssColorScheme.includes("dark")) {
      return "dark";
    }
    if (cssColorScheme.includes("light")) {
      return "light";
    }

    return config.darkThemeModes.includes(mode) ? "dark" : "light";
  };

  const getThemePreview = (mode: string) => {
    const resolved = resolveTheme(mode, themeMediaQuery.matches);
    previewProbe.setAttribute("data-theme", resolved);
    const style = globalThis.getComputedStyle(previewProbe);
    return {
      base: style.getPropertyValue("--color-base-100").trim(),
      primary: style.getPropertyValue("--color-primary").trim(),
      secondary: style.getPropertyValue("--color-secondary").trim(),
    };
  };

  const applyPreviewToChips = (
    chips: {
      base: globalThis.Element | null;
      primary: globalThis.Element | null;
      secondary: globalThis.Element | null;
    },
    preview: { base: string; primary: string; secondary: string },
  ) => {
    if (chips.base instanceof globalThis.HTMLElement) {
      chips.base.style.backgroundColor = preview.base;
    }
    if (chips.primary instanceof globalThis.HTMLElement) {
      chips.primary.style.backgroundColor = preview.primary;
    }
    if (chips.secondary instanceof globalThis.HTMLElement) {
      chips.secondary.style.backgroundColor = preview.secondary;
    }
  };

  const updateOptionPreviews = () => {
    themeOptions.forEach((option) => {
      const mode = option.getAttribute("data-theme-value");
      if (!mode) return;

      const preview = getThemePreview(mode);
      const chips = {
        base: option.querySelector('[data-theme-preview-chip="base"]'),
        primary: option.querySelector('[data-theme-preview-chip="primary"]'),
        secondary: option.querySelector(
          '[data-theme-preview-chip="secondary"]',
        ),
      };
      applyPreviewToChips(chips, preview);
    });
  };

  const updateThemePickerState = (mode: string) => {
    const safeMode = isValidMode(mode) ? mode : config.defaultThemeMode;
    themeOptions.forEach((option) => {
      const optionMode = option.getAttribute("data-theme-value");
      const isActive = optionMode === safeMode;
      option.classList.toggle("border-sage-500/40", isActive);
      option.classList.toggle("bg-sand-100", isActive);
      option.classList.toggle("text-ink-900", isActive);
    });

    if (themeCurrentLabel instanceof globalThis.HTMLElement) {
      themeCurrentLabel.textContent =
        themeLabels.get(safeMode) ?? config.defaultThemeMode;
    }
    applyPreviewToChips(themeCurrentChips, getThemePreview(safeMode));
  };

  const getStoredMode = (): string => {
    try {
      const storedMode = globalThis.localStorage.getItem(
        config.themeStorageKey,
      );
      return isValidMode(storedMode) ? storedMode : config.defaultThemeMode;
    } catch {
      return config.defaultThemeMode;
    }
  };

  const applyThemeMode = (mode: string, shouldPersist: boolean): void => {
    const safeMode = isValidMode(mode) ? mode : config.defaultThemeMode;
    const resolvedTheme = resolveTheme(safeMode, themeMediaQuery.matches);

    globalThis.document.documentElement.setAttribute(
      "data-theme",
      resolvedTheme,
    );
    globalThis.document.documentElement.dataset.themeMode = safeMode;
    globalThis.document.documentElement.dataset.colorScheme =
      detectColorScheme(safeMode);
    updateThemePickerState(safeMode);

    if (shouldPersist) {
      try {
        globalThis.localStorage.setItem(config.themeStorageKey, safeMode);
      } catch {
        return;
      }
    }
  };

  updateOptionPreviews();
  applyThemeMode(getStoredMode(), false);

  themeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const mode = option.getAttribute("data-theme-value");
      if (!mode) return;

      applyThemeMode(mode, true);
      if (themePicker instanceof globalThis.HTMLDetailsElement) {
        themePicker.open = false;
      }
    });
  });

  themeMediaQuery.addEventListener("change", () => {
    updateOptionPreviews();
    if (globalThis.document.documentElement.dataset.themeMode === "system") {
      applyThemeMode("system", false);
    } else {
      updateThemePickerState(
        globalThis.document.documentElement.dataset.themeMode ??
          config.defaultThemeMode,
      );
    }
  });

  globalThis.document.addEventListener("click", (event) => {
    if (!(themePicker instanceof globalThis.HTMLDetailsElement)) return;
    if (!themePicker.open) return;

    const target = event.target;
    if (!(target instanceof globalThis.Node)) return;
    if (themePicker.contains(target)) return;

    themePicker.open = false;
  });
}
