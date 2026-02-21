import { getCollection } from "astro:content";
import type { OGPage } from "./types";

export const buildOgPages = async (
  staticPages: Record<string, OGPage>,
): Promise<Record<string, OGPage>> => {
  const blogPosts = await getCollection("blog", (post) => !post.data.draft);
  const works = await getCollection("works");

  const blogPages: Record<string, OGPage> = Object.fromEntries(
    blogPosts.map((post) => [
      `blog/${post.id}`,
      {
        title: post.data.title,
        description: post.data.description,
      },
    ]),
  );

  const workPages: Record<string, OGPage> = Object.fromEntries(
    works.map((work) => [
      `works/${work.id}`,
      {
        title: work.data.title,
        description: work.data.description,
      },
    ]),
  );

  return {
    ...staticPages,
    ...blogPages,
    ...workPages,
  };
};
