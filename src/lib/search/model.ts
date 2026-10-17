export type SearchKind = "all" | "blog" | "works";

export type SearchSeedEntry = {
  title: string;
  description: string;
  href: string;
  kind: "blog" | "works";
  kindLabel: string;
  dateValue: number;
  dateLabel: string;
};

export type SearchStats = {
  blogCount: number;
  worksCount: number;
  totalCount: number;
};

export interface SearchOption {
  value: SearchKind;
  label: string;
  count: number;
}

interface SearchSubResult {
  title: string;
  url: string;
  excerpt?: string;
}

interface PagefindSearchResultData {
  url: string;
  excerpt?: string;
  meta: Record<string, string>;
  sub_results?: SearchSubResult[];
}

interface PagefindSearchEntry {
  id: string;
  data: () => Promise<PagefindSearchResultData>;
}

interface PagefindSearchResponse {
  results: PagefindSearchEntry[];
}

interface SearchFilters {
  type?: "blog" | "works";
}

interface PagefindSearchOptions {
  filters?: SearchFilters;
  sort?: {
    date: "asc" | "desc";
  };
}

export interface PagefindModule {
  init: () => Promise<void>;
  search: (
    term: string,
    options?: PagefindSearchOptions,
  ) => Promise<PagefindSearchResponse>;
}

export interface SearchResultViewModel {
  url: string;
  title: string;
  kind: "blog" | "works";
  kindLabel: string;
  dateLabel: string;
  excerptSegments: ExcerptSegment[];
  sectionTitle: string | null;
}

interface ExcerptSegment {
  text: string;
  highlighted: boolean;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeSearchText = (value: string): string =>
  value.toLocaleLowerCase("ja-JP").replace(/\s+/gu, "");

export const getTypeLabel = (value: SearchKind): string => {
  if (value === "blog") {
    return "Blog";
  }

  if (value === "works") {
    return "Works";
  }

  return "All";
};

const appendExcerptSegment = (
  segments: ExcerptSegment[],
  text: string,
  highlighted: boolean,
) => {
  const normalized = text.replace(/\s+/gu, " ");
  if (!normalized.trim()) {
    return;
  }

  const lastSegment = segments.at(-1);
  if (lastSegment && lastSegment.highlighted === highlighted) {
    lastSegment.text += normalized;
    return;
  }

  segments.push({ text: normalized, highlighted });
};

const parseExcerptSegments = (value: string): ExcerptSegment[] => {
  if (!value) {
    return [];
  }

  const parsed = new globalThis.DOMParser().parseFromString(
    `<body>${value}</body>`,
    "text/html",
  );
  const segments: ExcerptSegment[] = [];

  const visit = (node: globalThis.ChildNode, highlighted = false) => {
    if (node.nodeType === globalThis.Node.TEXT_NODE) {
      appendExcerptSegment(segments, node.textContent ?? "", highlighted);
      return;
    }

    if (!(node instanceof globalThis.HTMLElement)) {
      return;
    }

    const nextHighlighted = highlighted || node.tagName === "MARK";
    for (const child of Array.from(node.childNodes)) {
      visit(child, nextHighlighted);
    }
  };

  for (const child of Array.from(parsed.body.childNodes)) {
    visit(child);
  }

  const firstSegment = segments[0];
  if (firstSegment) {
    firstSegment.text = firstSegment.text.replace(/^[.。\s]+/u, "");
    if (!firstSegment.text.trim()) {
      segments.shift();
    }
  }

  return segments;
};

export const mergeSearchEntries = (
  responses: PagefindSearchResponse[],
): PagefindSearchEntry[] => {
  const merged = new Map<string, PagefindSearchEntry>();

  for (const response of responses) {
    for (const entry of response.results) {
      if (!merged.has(entry.id)) {
        merged.set(entry.id, entry);
      }
    }
  }

  return Array.from(merged.values());
};

const pickBestMatch = (data: PagefindSearchResultData) => {
  const title = data.meta.title ?? "Untitled";
  const matchedSection = data.sub_results?.find(
    (section) => section.url !== data.url,
  );

  return {
    url: matchedSection?.url ?? data.url,
    excerptHtml:
      matchedSection?.excerpt ??
      data.excerpt ??
      escapeHtml(data.meta.description ?? ""),
    sectionTitle:
      matchedSection && matchedSection.title !== title
        ? matchedSection.title
        : null,
  };
};

export const toSearchResult = (
  data: PagefindSearchResultData,
  queryTerm: string,
): SearchResultViewModel => {
  const title = data.meta.title ?? "Untitled";
  const kind = data.meta.type === "works" ? "works" : "blog";
  const match = pickBestMatch(data);
  const description = data.meta.description ?? "";
  const queryMatchesTitle =
    normalizeSearchText(queryTerm).length > 0 &&
    normalizeSearchText(title).includes(normalizeSearchText(queryTerm));
  const excerptSource =
    queryMatchesTitle && !match.sectionTitle && description
      ? escapeHtml(description)
      : match.excerptHtml;

  return {
    url: match.url,
    title,
    kind,
    kindLabel: data.meta.kind ?? getTypeLabel(kind),
    dateLabel: data.meta.dateLabel ?? "",
    excerptSegments: parseExcerptSegments(excerptSource),
    sectionTitle: match.sectionTitle,
  };
};

export function readSearchState(search: string): {
  query: string;
  type: SearchKind;
} {
  const params = new globalThis.URLSearchParams(search);
  const type = params.get("type");
  return {
    query: params.get("q")?.trim() ?? "",
    type: type === "blog" || type === "works" ? type : "all",
  };
}

export function buildSearchUrl(
  href: string,
  query: string,
  type: SearchKind,
): string {
  const url = new globalThis.URL(href);
  if (query.trim()) url.searchParams.set("q", query.trim());
  else url.searchParams.delete("q");
  if (type === "all") url.searchParams.delete("type");
  else url.searchParams.set("type", type);
  return `${url.pathname}${url.search}${url.hash}`;
}
