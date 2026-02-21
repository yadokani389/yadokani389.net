const getTitleScore = (title: string): number =>
  [...title].reduce(
    (score, char) => score + (/^[\x20-\x7E]$/.test(char) ? 1 : 1.8),
    0,
  );

export const getTitleFontSize = (title: string): number => {
  const score = getTitleScore(title);

  if (score <= 14) return 84;
  if (score <= 20) return 74;
  if (score <= 28) return 64;
  if (score <= 36) return 56;
  return 50;
};
