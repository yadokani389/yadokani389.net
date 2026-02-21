import { OGImageRoute } from "astro-og-canvas";
import { ensureCardFrameImage } from "../../lib/og/cardFrame";
import {
  bgGradient,
  descriptionColor,
  ogFonts,
  titleColor,
} from "../../lib/og/constants";
import { buildOgPages } from "../../lib/og/pages";
import { getTitleFontSize } from "../../lib/og/title";
import { OG_IMAGE_VERSION, STATIC_OG_PAGES } from "../../seo/pageMeta";

const pages = await buildOgPages(STATIC_OG_PAGES);
const cardFramePath = await ensureCardFrameImage(OG_IMAGE_VERSION);

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
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
            "Fredoka",
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
            "Fredoka",
          ],
        },
      },
      bgGradient,
      bgImage: {
        path: cardFramePath,
        fit: "cover",
      },
      padding: 90,
    };
  },
});
