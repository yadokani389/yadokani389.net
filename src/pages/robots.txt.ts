import type { APIRoute } from "astro";
import { SITE_URL } from "../consts";

const buildRobotsTxt = (sitemapUrl: string): string =>
  `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site ?? new globalThis.URL(SITE_URL);
  const sitemapUrl = new globalThis.URL(
    "sitemap-index.xml",
    siteUrl,
  ).toString();

  return new globalThis.Response(buildRobotsTxt(sitemapUrl), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
