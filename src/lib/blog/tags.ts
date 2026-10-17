import { getCollection, type CollectionEntry } from "astro:content";
type BlogPost = CollectionEntry<"blog">;

const sortByPublishDateDesc = (a: BlogPost, b: BlogPost): number =>
  b.data.date.getTime() - a.data.date.getTime();

export const BLOG_INDEX_PAGE_SIZE = 6;
export const BLOG_TAGS_PAGE_SIZE = 12;

export const getPublishedBlogPosts = async (): Promise<BlogPost[]> => {
  const posts = await getCollection("blog", (post) => post.data.draft !== true);
  return posts.sort(sortByPublishDateDesc);
};
