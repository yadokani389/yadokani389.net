# yadokani389.net

## Development

Enter the Nix development environment with `nix develop`, or run `direnv allow`
if you use direnv. It provides Node.js 24 LTS, pnpm, and Git hooks. The pinned Cloudflare CLI (`cf`)
is installed with the project dependencies.
Deployment builds and the development shell use the same toolchain.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

TypeScript stays on version 5 while `textlint-plugin-mdx` requires it.
The pnpm overrides select security fixes for Typography's selector parser and
remark-math's KaTeX dependency; remove them when the upstream dependency ranges
include the fixed versions.

Run `nix flake check` for Nix formatting, workflow validation, and typo checks.
The sandbox skips pnpm hooks because it has no `node_modules`. Run
`pnpm check` for formatting, lint, Astro and Svelte types, prose, unit tests,
the production build, and unused dependencies. `pnpm typecheck` runs only the type checks.
All hooks remain enabled in the development shell.

Run `pnpm check:full` to also test the built site with Playwright on desktop and
mobile. Tests cover search, tag navigation, preferences, accessibility, and browser
errors. Browser traces and screenshots are saved under `/tmp/yadokani389-playwright`.
On Linux, select the Nix browser before running the tests:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$(nix build .#chromium --print-out-paths --no-link)/bin/chromium"
pnpm check:full
```

Preview Workers use `public/_headers` to send `X-Robots-Tag: noindex` on
`yadokani389-net-preview-*.yadokani389.workers.dev`. Production domains are not matched.

The search feature uses Pagefind, and its index is generated during `pnpm run build`.

Because of that, search is not available in `pnpm dev`.
To test search locally, run:

```sh
pnpm run build
pnpm run preview
```

## Deployment

`pnpm build` generates the site, Pagefind index, and self-contained Cloudflare
Build Output under `.cloudflare/output/v0/`. The build uses Cloudflare's output
utilities directly, keeping Astro's static build independent of a Worker bundler.
Build-time tools stay in `dependencies`; validation tools stay in `devDependencies`.

```sh
pnpm build
pnpm exec cf deploy --prebuilt --mode production --dry-run
pnpm run deploy
```

Authenticate locally with `pnpm exec cf auth login`. CI uses
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
Production domains and preview Worker names are defined in `cloudflare.config.ts`.
CI sets `CLOUDFLARE_PREVIEW_NUMBER` and `SITE_URL` for pull request builds, then
uses `pnpm run deploy:preview` to deploy the same tested assets. Preview Workers keep
the existing URL pattern and `noindex` header, and are deleted when the PR closes.

## OG image

The default social image is `public/images/site-og-v1.png`; article images share
`assets/og/article-base-v11.png`. Edit `assets/og/index.html` and regenerate both
with Chromium. On Linux:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$(nix build .#chromium --print-out-paths --no-link)/bin/chromium"
pnpm generate:og
```

The renderer uses local fonts and the existing site icon. When changing the image,
version its filename and consuming references together so social services can
fetch the new image. Article design changes also require bumping `OG_IMAGE_VERSION`
in `src/seo/pageMeta.ts`.

## License

This project uses dual licensing:

- **Blog Content** (articles, posts, etc.): [CC BY-SA 4.0](./LICENSE-CC-BY-SA)
- **Code** (source code, configuration files, etc.): [MIT License](./LICENSE-MIT)
