import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import process from "node:process";
import { SITE_URL } from "./src/consts";
import rehypeBudoux from "./src/lib/rehype-budoux";
import remarkLinkCard from "remark-link-card-plus";
import remarkRuby from "remark-denden-ruby";
import remarkGemoji from "remark-gemoji";

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || SITE_URL,
  integrations: [svelte(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
    remarkPlugins: [
      remarkRuby,
      remarkGemoji,
      [
        remarkLinkCard,
        {
          cache: true,
          noFavicon: false,
          noThumbnail: true,
          shortenUrl: true,
        },
      ],
    ],
    rehypePlugins: [rehypeBudoux],
  },
});
