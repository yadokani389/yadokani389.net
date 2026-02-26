import { SITE_DESCRIPTION } from "../consts";

type PageMeta = {
  title: string;
  description: string;
};

export const OG_IMAGE_VERSION = "v10";

export const PAGE_META = {
  home: {
    title: "Home",
    description: SITE_DESCRIPTION,
  },
  about: {
    title: "About",
    description: "プロフィールや連絡先",
  },
  blogIndex: {
    title: "Blog",
    description: "日々の記録や開発メモ",
  },
  worksIndex: {
    title: "Works",
    description: "制作したゲームやツールの一覧",
  },
  notFound: {
    title: "404",
    description: "ページが見つかりません",
  },
} as const satisfies Record<string, PageMeta>;
