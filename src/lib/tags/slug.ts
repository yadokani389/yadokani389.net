export const normalizeTagName = (value: string): string =>
  value.trim().toLowerCase();

export const toTagSlug = (tag: string): string => {
  const normalized = normalizeTagName(tag).normalize("NFKC");
  const slug = normalized
    .replace(/[\s_]+/gu, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error(`Unable to build tag slug: "${tag}"`);
  }

  return slug;
};
