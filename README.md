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

Run `nix flake check` for Nix formatting and typo checks.
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

Workers Builds uses Worker Previews on the production Worker. Cloudflare adds
`X-Robots-Tag: noindex` to Preview `workers.dev` URLs; production domains are
not included.

The search feature uses Pagefind, and its index is generated during `pnpm run build`.

Because of that, search is not available in `pnpm dev`.
To test search locally, run:

```sh
pnpm run build
pnpm run preview
```

## Cloudflare Workers Builds

`pnpm build` generates the site, Pagefind index, and self-contained Cloudflare
Build Output under `.cloudflare/output/v0/`. The build uses Cloudflare's output
utilities directly, keeping Astro's static build independent of a Worker bundler.
Build-time tools stay in `dependencies`; validation tools stay in `devDependencies`.

Run CI locally before pushing:

```sh
pnpm check:full
nix flake check
```

Workers Builds watches the `main` branch and deploys it to production. Pull
requests build Worker Previews and receive a Preview URL comment from Cloudflare.
GitHub Actions does not run CI or deploy this site.

| Setting        | Production                                            | Preview                                                           |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Build command  | `pnpm install --frozen-lockfile --prod && pnpm build` | `pnpm install --frozen-lockfile --prod && pnpm run build:preview` |
| Deploy command | `pnpm run deploy`                                     | `pnpm run deploy:preview`                                         |
| Preview builds | —                                                     | enabled                                                           |

Both build triggers set `PNPM_VERSION=12.14.0` and
`SKIP_DEPENDENCY_INSTALL=1`; build commands install only production dependencies.

## Local deployment

`pnpm build` creates the Cloudflare Build Output. Authenticate with `cf` before
deploying locally:

```sh
pnpm exec cf auth login
pnpm build
pnpm exec cf deploy --prebuilt --mode production --dry-run
pnpm run deploy
```

Production domains and Worker Preview behavior are defined in
`cloudflare.config.ts`. Preview builds use the same Worker name and do not bind
production domains.

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
