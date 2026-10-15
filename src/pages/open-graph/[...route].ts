import { OGImageRoute } from "astro-og-canvas";
import {
  bgGradient,
  descriptionColor,
  ogFonts,
  titleColor,
} from "../../lib/og/constants";
import { buildOgPages } from "../../lib/og/pages";
import { getTitleFontSize } from "../../lib/og/title";

const pages = await buildOgPages();

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page) => {
    const titleSize = getTitleFontSize(page.title);

    return {
      title: page.title,
      description: page.description,
      fonts: ogFonts,
      font: {
        title: {
          color: titleColor,
          size: titleSize,
          weight: "Bold",
          lineHeight: 1.12,
          families: [
            "Fredoka Light",
            "Rounded Mplus 1c Bold",
            "Rounded Mplus 1c Medium",
          ],
        },
        description: {
          color: descriptionColor,
          size: 32,
          weight: "Medium",
          lineHeight: 1.3,
          families: [
            "Rounded Mplus 1c Medium",
            "Rounded Mplus 1c Bold",
            "Fredoka Light",
          ],
        },
      },
      bgGradient,
      bgImage: {
        path: "assets/og/article-base-v11.png",
        fit: "cover",
      },
      padding: 90,
    };
  },
});
