import { visit } from "unist-util-visit";

const languageWithFilenamePattern = /^([a-z0-9_+-]+):(.+)$/i;
const fileMetaPattern = /(?:^|\s)file=/;

type CodeNode = {
  lang?: string | null;
  meta?: string | null;
};

const normalizeFilename = (value: string): string | null => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 160);
};

const escapeMetaValue = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};

const remarkCodeFilename = () => {
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, "code", (node) => {
      const codeNode = node as CodeNode;
      if (!codeNode.lang) {
        return;
      }

      const langWithFilenameMatch = codeNode.lang.match(
        languageWithFilenamePattern,
      );
      if (!langWithFilenameMatch) {
        return;
      }

      const [, language, rawFilename] = langWithFilenameMatch;
      const normalizedFilename = normalizeFilename(rawFilename);
      if (!normalizedFilename) {
        return;
      }

      codeNode.lang = language;

      const existingMeta = codeNode.meta?.trim();
      if (existingMeta && fileMetaPattern.test(existingMeta)) {
        return;
      }

      const fileMeta = `file="${escapeMetaValue(normalizedFilename)}"`;
      codeNode.meta = existingMeta ? `${fileMeta} ${existingMeta}` : fileMeta;
    });
  };
};

export default remarkCodeFilename;
