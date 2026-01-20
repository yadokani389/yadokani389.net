// @ts-check
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";
import { SITE_URL } from "./src/consts";

// https://astro.build/config
export default defineConfig({
  site: import.meta.env.SITE_URL ?? SITE_URL,
  integrations: [svelte(), mdx()],
});
