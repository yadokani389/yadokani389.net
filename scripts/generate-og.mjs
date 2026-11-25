import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const images = [
  { view: "default", path: "../public/images/site-og.png" },
  { view: "article", path: "../assets/og/article-base.png" },
];
const temporary = await mkdtemp(join(tmpdir(), "yadokani389-og-"));
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const errors = [];

try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL("../assets/og/index.html", import.meta.url).href);
  await page.evaluate(async () => {
    await globalThis.document.fonts.ready;
    await Promise.all(
      [...globalThis.document.images].map((image) => image.decode()),
    );
  });
  assert(
    await page.evaluate(
      () =>
        globalThis.document.fonts.check("500 144px Fredoka") &&
        globalThis.document.fonts.check(
          '500 34px "M PLUS Rounded 1c"',
          "制作物と日々の記録",
        ),
    ),
    "The local brand and Japanese fonts must load",
  );
  assert(
    await page.locator("h1").evaluate((heading) => {
      const bounds = heading.getBoundingClientRect();
      return heading.scrollWidth <= heading.clientWidth && bounds.right <= 1200;
    }),
    "The wordmark must fit inside the image",
  );
  const title = await page.locator("main").boundingBox();
  const lockup = await page.locator(".lockup").boundingBox();
  assert(
    lockup.y >= title.y + title.height,
    "The identity must sit below the title",
  );
  assert.deepEqual(errors, []);
  await mkdir(new URL("../public/images/", import.meta.url), {
    recursive: true,
  });
  for (const { view, path } of images) {
    await page.locator("body").evaluate((body, view) => {
      body.dataset.view = view;
    }, view);
    const screenshot = join(temporary, `${view}.png`);
    const output = fileURLToPath(new URL(path, import.meta.url));
    await page.screenshot({ path: screenshot });
    const disc = await page.locator(".disc").boundingBox();
    const blend = await sharp(screenshot)
      .extract({
        left: Math.round(disc.x + disc.width / 8),
        top: Math.round(disc.y + disc.height / 2),
        width: 1,
        height: 1,
      })
      .removeAlpha()
      .raw()
      .toBuffer();
    assert.deepEqual(
      [...blend],
      [232, 240, 226],
      "The mascot must blend into its disc",
    );
    await sharp(screenshot).png({ compressionLevel: 9 }).toFile(output);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    assert.equal(metadata.format, "png");
    assert.equal(await page.locator("main").isVisible(), view === "default");
    assert.equal(await page.locator(".lockup").isVisible(), true);
    globalThis.console.log(`OG image: ${output}`);
  }
} finally {
  await browser.close();
}
