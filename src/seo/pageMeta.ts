import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";

type PageMeta = {
  title: string;
  description: string;
};

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

export const STATIC_OG_PAGES: Record<string, PageMeta> = {
  home: PAGE_META.home,
  about: PAGE_META.about,
  blog: PAGE_META.blogIndex,
  works: PAGE_META.worksIndex,
  default: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const STATIC_OG_IMAGE_BY_PATH: Record<string, string> = {
  "/": "/open-graph/home.png",
  "/about": "/open-graph/about.png",
  "/blog": "/open-graph/blog.png",
  "/works": "/open-graph/works.png",
  "/404": "/open-graph/default.png",
};

export const OG_DEFAULT_IMAGE_PATH = "/open-graph/default.png";
