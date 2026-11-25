import { OGImageRoute } from "astro-og-canvas";
import { bgGradient, ogFonts, titleColor } from "../../lib/og/constants";
import { buildOgPages } from "../../lib/og/pages";
import { formatOgText } from "../../lib/og/text";
import { getTitleFontSize } from "../../lib/og/title";

const pages = await buildOgPages();

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page) => ({
    title: formatOgText(page.title),
    fonts: ogFonts,
    font: {
      title: {
        color: titleColor,
        size: getTitleFontSize(page.title),
        weight: "Bold",
        lineHeight: 1.12,
        families: [
          "Fredoka Light",
          "Rounded Mplus 1c Bold",
          "Rounded Mplus 1c Medium",
        ],
      },
    },
    bgGradient,
    bgImage: {
      path: "assets/og/article-base.png",
      fit: "cover",
    },
    padding: 90,
  }),
});
