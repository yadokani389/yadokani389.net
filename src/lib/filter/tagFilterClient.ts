type TagFilterConfig = {
  param: string;
};

const tagFilterConfigElementId = "tag-filter-config";

export function readTagFilterConfig(): TagFilterConfig | null {
  const configNode = globalThis.document.getElementById(
    tagFilterConfigElementId,
  );
  if (!(configNode instanceof globalThis.HTMLScriptElement)) {
    return null;
  }

  try {
    return JSON.parse(configNode.textContent ?? "") as TagFilterConfig;
  } catch {
    return null;
  }
}

export function applyTagFilter(paramName: string): void {
  const params = new globalThis.URLSearchParams(
    globalThis.window.location.search,
  );
  const tag = params.get(paramName);
  if (!tag) return;

  const normalized = tag.toLowerCase();
  const cards = Array.from(globalThis.document.querySelectorAll("[data-tags]"));
  cards.forEach((card) => {
    const raw = card.getAttribute("data-tags") ?? "";
    const tags = raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (!tags.includes(normalized)) {
      card.setAttribute("hidden", "");
    }
  });

  const banner = globalThis.document.querySelector("[data-filter-banner]");
  const label = globalThis.document.querySelector("[data-filter-label]");
  if (
    banner instanceof globalThis.HTMLElement &&
    label instanceof globalThis.HTMLElement
  ) {
    label.textContent = tag;
    banner.hidden = false;
  }
}
