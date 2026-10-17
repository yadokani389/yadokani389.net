import { normalizeTagName, toTagSlug } from "./slug.ts";

type TaggedEntry = { data: { tags?: readonly string[] } };
type Tag = { slug: string; name: string; count: number };

export function buildTagIndex(entries: readonly TaggedEntry[]): Tag[] {
  const tags = new Map<string, Tag>();

  for (const entry of entries) {
    const counted = new Set<string>();
    for (const rawTag of entry.data.tags ?? []) {
      const name = rawTag.trim();
      if (!name) continue;
      const slug = toTagSlug(name);
      const existing = tags.get(slug);
      if (
        existing &&
        normalizeTagName(existing.name) !== normalizeTagName(name)
      ) {
        throw new Error(
          `Tag slug collision detected: "${existing.name}" and "${name}" both resolve to "${slug}"`,
        );
      }
      if (counted.has(slug)) continue;
      counted.add(slug);
      if (existing) existing.count += 1;
      else tags.set(slug, { slug, name, count: 1 });
    }
  }

  return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function getEntriesByTagName<T extends TaggedEntry>(
  entries: readonly T[],
  tagName: string,
): T[] {
  const target = normalizeTagName(tagName);
  return entries.filter((entry) =>
    (entry.data.tags ?? []).some((tag) => normalizeTagName(tag) === target),
  );
}
