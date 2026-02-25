import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "../consts";

export async function GET(context: APIContext) {
  const site = context.site ?? SITE_URL;
  const feedUrl = new globalThis.URL("/rss.xml", site).toString();
  const posts = (
    await getCollection("blog", ({ data }) => data.draft !== true)
  ).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: `${SITE_TITLE} Blog`,
    description: SITE_DESCRIPTION,
    site,
    trailingSlash: false,
    xmlns: {
      atom: "http://www.w3.org/2005/Atom",
    },
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: `/blog/${post.id}`,
    })),
    customData: `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" /><language>ja-jp</language>`,
  });
}
