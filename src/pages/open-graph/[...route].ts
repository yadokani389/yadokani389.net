import { getCollection } from "astro:content";
import { OGImageRoute } from "astro-og-canvas";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import type { CanvasKit, FontMgr } from "canvaskit-wasm";
import { SITE_TITLE } from "../../consts";
import { OG_IMAGE_VERSION, STATIC_OG_PAGES } from "../../seo/pageMeta";

type OGPage = {
  title: string;
  description: string;
};

const blogPosts = await getCollection("blog", (post) => !post.data.draft);
const works = await getCollection("works");

const blogPages: Record<string, OGPage> = Object.fromEntries(
  blogPosts.map((post) => [
    `blog/${post.id}`,
    {
      title: post.data.title,
      description: post.data.description,
    },
  ]),
);

const workPages: Record<string, OGPage> = Object.fromEntries(
  works.map((work) => [
    `works/${work.id}`,
    {
      title: work.data.title,
      description: work.data.description,
    },
  ]),
);

const pages: Record<string, OGPage> = {
  ...STATIC_OG_PAGES,
  ...blogPages,
  ...workPages,
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const CARD_FRAME_PATH = path.join(
  process.cwd(),
  "node_modules",
  ".astro-og-canvas",
  `card-frame-${OG_IMAGE_VERSION}.png`,
);
const BRAND_ICON_PATH = path.join(process.cwd(), "public", "favicon.png");
const BRAND_NAME = SITE_TITLE;
const BRAND_FONT_URL =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/latin-700-normal.ttf";

const { resolve } = createRequire(import.meta.url);
let canvasKitPromise: Promise<CanvasKit> | undefined;
let brandFontManagerPromise: Promise<FontMgr> | undefined;

const getCanvasKit = (): Promise<CanvasKit> => {
  if (!canvasKitPromise) {
    canvasKitPromise = import("canvaskit-wasm/full").then(({ default: init }) =>
      init({
        locateFile: (file) => resolve(`canvaskit-wasm/bin/full/${file}`),
      }),
    );
  }

  return canvasKitPromise;
};

const getBrandFontManager = (CanvasKit: CanvasKit): Promise<FontMgr> => {
  if (!brandFontManagerPromise) {
    brandFontManagerPromise = globalThis
      .fetch(BRAND_FONT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load brand font: ${response.status}`);
        }

        return response.arrayBuffer();
      })
      .then((fontData) => {
        const manager = CanvasKit.FontMgr.FromData(fontData);
        if (!manager) {
          throw new Error("Failed to create font manager for brand text");
        }

        return manager;
      });
  }

  return brandFontManagerPromise;
};

const generateCardFrameImage = async (): Promise<Buffer> => {
  const CanvasKit = await getCanvasKit();
  const brandFontManager = await getBrandFontManager(CanvasKit);
  const iconBuffer = await readFile(BRAND_ICON_PATH);
  const iconImage = CanvasKit.MakeImageFromEncoded(iconBuffer);

  if (!iconImage) {
    throw new Error(`Failed to decode icon image: ${BRAND_ICON_PATH}`);
  }

  const iconImageWithMipmaps = iconImage.makeCopyWithDefaultMipmaps();

  const surface = CanvasKit.MakeSurface(OG_WIDTH, OG_HEIGHT);
  if (!surface) {
    throw new Error("Failed to create CanvasKit surface");
  }

  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.TRANSPARENT);

  const cardRect = CanvasKit.XYWHRect(38, 38, 1124, 554);
  const cardRRect = CanvasKit.RRectXY(cardRect, 22, 22);

  const shadowPaint = new CanvasKit.Paint();
  shadowPaint.setColor(CanvasKit.Color(11, 35, 45, 0.18));
  shadowPaint.setMaskFilter(
    CanvasKit.MaskFilter.MakeBlur(CanvasKit.BlurStyle.Normal, 20, true),
  );
  canvas.drawRRect(
    CanvasKit.RRectXY(CanvasKit.XYWHRect(38, 44, 1124, 554), 22, 22),
    shadowPaint,
  );

  const cardPaint = new CanvasKit.Paint();
  cardPaint.setColor(CanvasKit.Color(247, 251, 252));
  canvas.drawRRect(cardRRect, cardPaint);

  const iconSize = 96;
  const rightPadding = 64;
  const bottomPadding = 56;
  const iconX = OG_WIDTH - rightPadding - iconSize;
  const iconY = OG_HEIGHT - bottomPadding - iconSize;
  const iconRect = CanvasKit.XYWHRect(iconX, iconY, iconSize, iconSize);

  const brandParagraphStyle = new CanvasKit.ParagraphStyle({
    textStyle: {
      color: CanvasKit.Color(30, 72, 66, 1),
      fontFamilies: ["Noto Sans JP"],
      fontSize: 44,
      fontStyle: { weight: CanvasKit.FontWeight.Bold },
    },
    textAlign: CanvasKit.TextAlign.Left,
    textDirection: CanvasKit.TextDirection.LTR,
  });
  const brandParagraphBuilder = CanvasKit.ParagraphBuilder.Make(
    brandParagraphStyle,
    brandFontManager,
  );
  brandParagraphBuilder.addText(BRAND_NAME);
  const brandParagraph = brandParagraphBuilder.build();
  brandParagraph.layout(420);
  const brandTextWidth = brandParagraph.getLongestLine();
  const brandTextHeight = brandParagraph.getHeight();
  const brandGap = 20;
  const brandX = iconX - brandGap - brandTextWidth;
  const brandY = iconY + (iconSize - brandTextHeight) / 2;
  canvas.drawParagraph(brandParagraph, brandX, brandY);

  canvas.save();
  canvas.clipRRect(
    CanvasKit.RRectXY(iconRect, 18, 18),
    CanvasKit.ClipOp.Intersect,
    true,
  );
  const iconSourceRect = CanvasKit.XYWHRect(
    0,
    0,
    iconImage.width(),
    iconImage.height(),
  );
  const iconPassSize = iconSize * 2;
  const iconPassRect = CanvasKit.XYWHRect(0, 0, iconPassSize, iconPassSize);
  const iconSurface = CanvasKit.MakeSurface(iconPassSize, iconPassSize);
  if (!iconSurface) {
    throw new Error("Failed to create icon supersampling surface");
  }
  const iconCanvas = iconSurface.getCanvas();
  iconCanvas.clear(CanvasKit.TRANSPARENT);

  const iconPassPaint = new CanvasKit.Paint();
  iconPassPaint.setDither(true);
  iconCanvas.drawImageRectOptions(
    iconImageWithMipmaps,
    iconSourceRect,
    iconPassRect,
    CanvasKit.FilterMode.Linear,
    CanvasKit.MipmapMode.Linear,
    iconPassPaint,
  );

  const iconPreparedImage = iconSurface.makeImageSnapshot();
  const iconPaint = new CanvasKit.Paint();
  iconPaint.setAntiAlias(true);
  iconPaint.setDither(true);
  const iconBlurFilter = CanvasKit.ImageFilter.MakeBlur(
    0.45,
    0.45,
    CanvasKit.TileMode.Decal,
    null,
  );
  iconPaint.setImageFilter(iconBlurFilter);
  canvas.drawImageRectCubic(
    iconPreparedImage,
    iconPassRect,
    iconRect,
    1,
    0,
    iconPaint,
  );
  canvas.restore();

  const image = surface.makeImageSnapshot();
  const encoded = image.encodeToBytes(CanvasKit.ImageFormat.PNG, 100);

  brandParagraph.delete();
  brandParagraphBuilder.delete();
  iconPaint.delete();
  iconBlurFilter.delete();
  iconPassPaint.delete();
  iconPreparedImage.delete();
  iconSurface.dispose();
  iconImageWithMipmaps.delete();
  iconImage.delete();
  cardPaint.delete();
  shadowPaint.delete();
  image.delete();
  surface.dispose();

  if (!encoded) {
    throw new Error("Failed to encode generated card frame as PNG");
  }

  return Buffer.from(encoded);
};

const ensureCardFrameImage = async (): Promise<string> => {
  try {
    const existing = await readFile(CARD_FRAME_PATH);
    if (existing.length > 0) {
      return CARD_FRAME_PATH;
    }
  } catch {
    await mkdir(path.dirname(CARD_FRAME_PATH), { recursive: true });
  }

  const cardFrame = await generateCardFrameImage();
  await writeFile(CARD_FRAME_PATH, cardFrame);

  return CARD_FRAME_PATH;
};

const cardFramePath = await ensureCardFrameImage();

const ogFonts = [
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-500-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/latin-500-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/latin-700-normal.ttf",
];

const bgGradient: [number, number, number][] = [
  [101, 197, 233],
  [132, 225, 178],
];

const titleColor: [number, number, number] = [18, 22, 28];
const descriptionColor: [number, number, number] = [84, 94, 108];

const getTitleScore = (title: string): number =>
  [...title].reduce(
    (score, char) => score + (/^[\x20-\x7E]$/.test(char) ? 1 : 1.8),
    0,
  );

const getTitleFontSize = (title: string): number => {
  const score = getTitleScore(title);

  if (score <= 14) return 84;
  if (score <= 20) return 74;
  if (score <= 28) return 64;
  if (score <= 36) return 56;
  return 50;
};

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
        },
        description: {
          color: descriptionColor,
          size: 32,
          lineHeight: 1.3,
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
