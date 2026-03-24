# yadokani389.net

## Development

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
