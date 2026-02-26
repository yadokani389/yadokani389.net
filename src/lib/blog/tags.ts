import { getCollection, type CollectionEntry } from "astro:content";
import { normalizeBlogTagName, toBlogTagSlug } from "./tagSlug";

type BlogPost = CollectionEntry<"blog">;

export type BlogTag = {
  slug: string;
  name: string;
  count: number;
};

type BlogTagAccumulatorValue = {
  name: string;
  normalizedName: string;
  count: number;
};

const sortByPublishDateDesc = (a: BlogPost, b: BlogPost): number =>
  b.data.date.getTime() - a.data.date.getTime();

export const BLOG_TAGS_PAGE_SIZE = 12;

export const getPublishedBlogPosts = async (): Promise<BlogPost[]> => {
  const posts = await getCollection("blog", (post) => post.data.draft !== true);
  return posts.sort(sortByPublishDateDesc);
};

export const buildBlogTagIndex = (posts: BlogPost[]): BlogTag[] => {
  const tagMap = new Map<string, BlogTagAccumulatorValue>();

  for (const post of posts) {
    for (const rawTag of post.data.tags) {
      const trimmed = rawTag.trim();
      if (!trimmed) {
        continue;
      }

      const slug = toBlogTagSlug(trimmed);
      const normalizedName = normalizeBlogTagName(trimmed);
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

export const getBlogPostsByTagName = (
  posts: BlogPost[],
  tagName: string,
): BlogPost[] => {
  const normalizedTarget = normalizeBlogTagName(tagName);

  return posts.filter((post) =>
    post.data.tags.some(
      (tag) => normalizeBlogTagName(tag) === normalizedTarget,
    ),
  );
};
