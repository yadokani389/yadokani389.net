const whitespacePattern = /\s+/gu;
const japaneseCharacterPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

const segmentJapaneseQuery = (value: string): string => {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) {
    return value;
  }

  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  const segments = Array.from(segmenter.segment(value))
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.segment.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return value;
  }

  return segments.join(" ");
};

export const buildSearchQueries = (value: string): string[] => {
  const trimmed = value.trim().replace(whitespacePattern, " ");
  if (!trimmed) {
    return [];
  }

  const variants = [trimmed];

  if (!trimmed.includes(" ") && japaneseCharacterPattern.test(trimmed)) {
    const segmented = segmentJapaneseQuery(trimmed);
    if (segmented !== trimmed) {
      variants.push(segmented);
    }
  }

  return Array.from(new Set(variants));
};
