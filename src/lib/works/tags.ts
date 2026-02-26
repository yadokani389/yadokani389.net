import { getCollection, type CollectionEntry } from "astro:content";
import { normalizeTagName, toTagSlug } from "../tags/slug";

type Work = CollectionEntry<"works">;

export type WorkTag = {
  slug: string;
  name: string;
  count: number;
};

type WorkTagAccumulatorValue = {
  name: string;
  normalizedName: string;
  count: number;
};

const sortByPublishDateDesc = (a: Work, b: Work): number =>
  b.data.date.getTime() - a.data.date.getTime();

export const WORK_INDEX_PAGE_SIZE = 12;
export const WORK_TAGS_PAGE_SIZE = 12;

export const getWorks = async (): Promise<Work[]> => {
  const works = await getCollection("works");
  return works.sort(sortByPublishDateDesc);
};

export const buildWorkTagIndex = (works: Work[]): WorkTag[] => {
  const tagMap = new Map<string, WorkTagAccumulatorValue>();

  for (const work of works) {
    for (const rawTag of work.data.tags ?? []) {
      const trimmed = rawTag.trim();
      if (!trimmed) {
        continue;
      }

      const slug = toTagSlug(trimmed);
      const normalizedName = normalizeTagName(trimmed);
      const existing = tagMap.get(slug);

      if (!existing) {
        tagMap.set(slug, {
          name: trimmed,
          normalizedName,
          count: 1,
        });
        continue;
      }

      if (existing.normalizedName !== normalizedName) {
        throw new Error(
          `Tag slug collision detected: "${existing.name}" and "${trimmed}" both resolve to "${slug}"`,
        );
      }

      existing.count += 1;
    }
  }

  return Array.from(tagMap.entries())
    .map(([slug, value]) => ({
      slug,
      name: value.name,
      count: value.count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
};

export const getWorksByTagName = (works: Work[], tagName: string): Work[] => {
  const normalizedTarget = normalizeTagName(tagName);

  return works.filter((work) =>
    (work.data.tags ?? []).some(
      (tag) => normalizeTagName(tag) === normalizedTarget,
    ),
  );
};
