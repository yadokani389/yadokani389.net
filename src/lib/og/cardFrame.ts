import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import type { CanvasKit, FontMgr } from "canvaskit-wasm";
import {
  BRAND_FONT_URL,
  BRAND_ICON_PUBLIC_PATH,
  BRAND_NAME,
  OG_HEIGHT,
  OG_WIDTH,
} from "./constants";

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

const getBrandFontManager = (canvasKit: CanvasKit): Promise<FontMgr> => {
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
        const manager = canvasKit.FontMgr.FromData(fontData);
        if (!manager) {
          throw new Error("Failed to create font manager for brand text");
        }

        return manager;
      });
  }

  return brandFontManagerPromise;
};

const generateCardFrameImage = async (
  brandIconPath: string,
): Promise<Buffer> => {
  const canvasKit = await getCanvasKit();
  const brandFontManager = await getBrandFontManager(canvasKit);
  const iconBuffer = await readFile(brandIconPath);
  const iconImage = canvasKit.MakeImageFromEncoded(iconBuffer);

  if (!iconImage) {
    throw new Error(`Failed to decode icon image: ${brandIconPath}`);
  }

  const iconImageWithMipmaps = iconImage.makeCopyWithDefaultMipmaps();
  const surface = canvasKit.MakeSurface(OG_WIDTH, OG_HEIGHT);
  if (!surface) {
    throw new Error("Failed to create CanvasKit surface");
  }

  const canvas = surface.getCanvas();
  canvas.clear(canvasKit.TRANSPARENT);

  const cardRect = canvasKit.XYWHRect(38, 38, 1124, 554);
  const cardRRect = canvasKit.RRectXY(cardRect, 22, 22);

  const shadowPaint = new canvasKit.Paint();
  shadowPaint.setColor(canvasKit.Color(11, 35, 45, 0.18));
  shadowPaint.setMaskFilter(
    canvasKit.MaskFilter.MakeBlur(canvasKit.BlurStyle.Normal, 20, true),
  );
  canvas.drawRRect(
    canvasKit.RRectXY(canvasKit.XYWHRect(38, 44, 1124, 554), 22, 22),
    shadowPaint,
  );

  const cardPaint = new canvasKit.Paint();
  cardPaint.setColor(canvasKit.Color(247, 251, 252));
  canvas.drawRRect(cardRRect, cardPaint);

  const iconSize = 96;
  const rightPadding = 64;
  const bottomPadding = 56;
  const iconX = OG_WIDTH - rightPadding - iconSize;
  const iconY = OG_HEIGHT - bottomPadding - iconSize;
  const iconRect = canvasKit.XYWHRect(iconX, iconY, iconSize, iconSize);

  const brandParagraphStyle = new canvasKit.ParagraphStyle({
    textStyle: {
      color: canvasKit.Color(30, 72, 66, 1),
      fontFamilies: ["Fredoka"],
      fontSize: 44,
      fontStyle: { weight: canvasKit.FontWeight.Bold },
    },
    textAlign: canvasKit.TextAlign.Left,
    textDirection: canvasKit.TextDirection.LTR,
  });
  const brandParagraphBuilder = canvasKit.ParagraphBuilder.Make(
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
    canvasKit.RRectXY(iconRect, 18, 18),
    canvasKit.ClipOp.Intersect,
    true,
  );
  const iconSourceRect = canvasKit.XYWHRect(
    0,
    0,
    iconImage.width(),
    iconImage.height(),
  );
  const iconPassSize = iconSize * 2;
  const iconPassRect = canvasKit.XYWHRect(0, 0, iconPassSize, iconPassSize);
  const iconSurface = canvasKit.MakeSurface(iconPassSize, iconPassSize);
  if (!iconSurface) {
    throw new Error("Failed to create icon supersampling surface");
  }
  const iconCanvas = iconSurface.getCanvas();
  iconCanvas.clear(canvasKit.TRANSPARENT);

  const iconPassPaint = new canvasKit.Paint();
  iconPassPaint.setDither(true);
  iconCanvas.drawImageRectOptions(
    iconImageWithMipmaps,
    iconSourceRect,
    iconPassRect,
    canvasKit.FilterMode.Linear,
    canvasKit.MipmapMode.Linear,
    iconPassPaint,
  );

  const iconPreparedImage = iconSurface.makeImageSnapshot();
  const iconPaint = new canvasKit.Paint();
  iconPaint.setAntiAlias(true);
  iconPaint.setDither(true);
  const iconBlurFilter = canvasKit.ImageFilter.MakeBlur(
    0.45,
    0.45,
    canvasKit.TileMode.Decal,
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
  const encoded = image.encodeToBytes(canvasKit.ImageFormat.PNG, 100);

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

export const ensureCardFrameImage = async (
  ogImageVersion: string,
): Promise<string> => {
  const cardFramePath = path.join(
    process.cwd(),
    "node_modules",
    ".astro-og-canvas",
    `card-frame-${ogImageVersion}.png`,
  );
  const brandIconPath = path.join(process.cwd(), BRAND_ICON_PUBLIC_PATH);

  try {
    const existing = await readFile(cardFramePath);
    if (existing.length > 0) {
      return cardFramePath;
    }
  } catch {
    await mkdir(path.dirname(cardFramePath), { recursive: true });
  }

  const cardFrame = await generateCardFrameImage(brandIconPath);
  await writeFile(cardFramePath, cardFrame);

  return cardFramePath;
};
