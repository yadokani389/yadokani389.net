# yadokani389.net

## Development

Enter the Nix development environment with `nix develop`, or run `direnv allow`
if you use direnv. It provides Node.js 24 LTS, pnpm, Wrangler, and Git hooks.
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
`pnpm format:check`, `pnpm check`, `pnpm lint`, `pnpm textlint`, and `pnpm build`
separately for application validation. All hooks remain enabled in the development shell.

Preview Workers use `public/_headers` to send `X-Robots-Tag: noindex` on
`yadokani389-net-preview-*.yadokani389.workers.dev`. Production domains are not matched.

The search feature uses Pagefind, and its index is generated during `pnpm run build`.

Because of that, search is not available in `pnpm dev`.
To test search locally, run:

```sh
pnpm run build
pnpm run preview
```

## License

This project uses dual licensing:

- **Blog Content** (articles, posts, etc.): [CC BY-SA 4.0](./LICENSE-CC-BY-SA)
- **Code** (source code, configuration files, etc.): [MIT License](./LICENSE-MIT)
