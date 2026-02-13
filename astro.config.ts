import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import process from "node:process";
import { SITE_URL } from "./src/consts";
import rehypeBudoux from "./src/lib/rehype-budoux";

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || SITE_URL,
  integrations: [svelte(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    rehypePlugins: [rehypeBudoux],
  },
});
