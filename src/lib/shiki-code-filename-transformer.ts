const filePattern = /(?:^|\s)file=(?:"([^"]+)"|'([^']+)'|([^\s]+))/;

const getFilenameFromMeta = (rawMeta?: string): string | null => {
  if (!rawMeta) {
    return null;
  }

  const match = rawMeta.match(filePattern);
  const file = (match?.[1] ?? match?.[2] ?? match?.[3])?.trim();
  if (file) {
    return file;
  }

  return null;
};

const shikiCodeFilenameTransformer = () => {
  return {
    name: "shiki-code-filename",
    pre(
      this: { options: { meta?: { __raw?: string } } },
      hast: { properties?: Record<string, unknown> },
    ) {
      const filename = getFilenameFromMeta(this.options.meta?.__raw);
      if (!filename) {
        return;
      }

      hast.properties = {
        ...(hast.properties ?? {}),
        "data-filename": filename,
      };
    },
  };
};

export default shikiCodeFilenameTransformer;
