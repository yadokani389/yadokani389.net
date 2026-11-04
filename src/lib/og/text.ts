import { loadDefaultJapaneseParser } from "budoux";

const parser = loadDefaultJapaneseParser();
const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

export const formatOgText = (text: string): string => {
  const boundaries = new Set(parser.parseBoundaries(text));
  return [...segmenter.segment(text)]
    .map(({ segment, index }) =>
      index === 0
        ? segment
        : (boundaries.has(index) ? "\u200b" : "\u2060") + segment,
    )
    .join("");
};
