import js from "@eslint/js";
import * as astroParser from "astro-eslint-parser";
import * as tsPlugin from "@typescript-eslint/eslint-plugin";
import * as tsParser from "@typescript-eslint/parser";
import * as eslintPluginAstro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";
import globals from "globals";

export default [
  {
    ignores: [".astro/**", ".cloudflare/**", "dist/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}", "**/*.astro"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },
  ...eslintPluginAstro.configs["flat/recommended"],
  ...svelte.configs.recommended,
  ...svelte.configs.prettier,
  {
    files: ["**/*.svelte"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: tsParser,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-undef": "off",
      "svelte/prefer-svelte-reactivity": "off",
    },
  },
  {
    files: ["**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".astro"],
      },
    },
  },
];
