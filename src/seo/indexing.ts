export const isTagArchive = (pathname: string): boolean =>
  /^\/(?:blog|works)\/tags(?:\/|$)/.test(pathname);
