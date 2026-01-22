const js = require("@eslint/js");
const eslintPluginAstro = require("eslint-plugin-astro");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    ignores: [".astro/**", "dist/**"],
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
  {
    files: ["**/*.astro"],
    languageOptions: {
      parser: require("astro-eslint-parser"),
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".astro"],
      },
    },
  },
  {
    files: ["eslint.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
