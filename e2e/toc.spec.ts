import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const articlePath = "/blog/20261103-bunkasai-taiyaq";

for (const height of [844, 480]) {
  test(`mobile contents allow page scrolling at their boundary at ${height}px height`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
    await page.setViewportSize({ width: 390, height });
    await page.goto(articlePath);
    await page.evaluate(() => globalThis.document.fonts.ready);
    const toc = page.locator("[data-article-toc]");
    await toc.locator("summary").click();
    const nav = toc.getByRole("navigation", { name: "目次" });
    await nav.hover();
    await nav.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const scrollY = await page.evaluate(() => globalThis.scrollY);
    await page.mouse.wheel(0, 200);
    await expect
      .poll(() => page.evaluate(() => globalThis.scrollY))
      .toBeGreaterThan(scrollY);
  });
}

test("contents navigation replaces history and Back returns to the previous page", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({
    width: testInfo.project.name === "desktop" ? 1440 : 390,
    height: 844,
  });
  await page.goto("/blog?ref=toc-history");
  await page.locator(`a.card-title-link[href="${articlePath}"]`).click();
  await page.evaluate(() =>
    globalThis.history.replaceState({ source: "contents" }, "", "?ref=article"),
  );
  const historyLength = await page.evaluate(() => globalThis.history.length);
  const toc = page.locator("[data-article-toc]");
  if (testInfo.project.name === "mobile") {
    await toc.locator("summary").click();
  }
  const links = toc.locator("nav a");
  for (const [index, keyboard] of [
    [3, false],
    [1, true],
  ] as const) {
    const link = links.nth(index);
    const href = await link.getAttribute("href");
    if (keyboard) await link.press("Enter");
    else await link.click();
    await expect
      .poll(() => decodeURIComponent(new globalThis.URL(page.url()).hash))
      .toBe(href);
    await expect(link).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => globalThis.history.length)).toBe(
      historyLength,
    );
    await expect(page.locator("[data-article-body] :focus")).toHaveAttribute(
      "id",
      href?.slice(1) ?? "",
    );
    expect(await page.evaluate(() => globalThis.history.state)).toEqual({
      source: "contents",
    });
    expect(new globalThis.URL(page.url()).search).toBe("?ref=article");
  }
  const lastUrl = page.url();
  await page.goBack();
  await expect(page).toHaveURL(/\/blog\/?\?ref=toc-history$/);
  await page.goForward();
  await expect(page).toHaveURL(lastUrl);
  await expect(links.nth(1)).toHaveAttribute("aria-current", "location");
});

test("modified contents links retain native new-tab navigation", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 844 });
  await page.goto(articlePath);
  const link = page.locator("[data-article-toc] nav a").nth(1);
  const href = await link.getAttribute("href");
  const originalUrl = page.url();
  for (const button of ["left", "middle"] as const) {
    const newPage = context.waitForEvent("page");
    await link.click(
      button === "left" ? { modifiers: ["ControlOrMeta"] } : { button },
    );
    const tab = await newPage;
    await tab.waitForLoadState();
    expect(decodeURIComponent(new globalThis.URL(tab.url()).hash)).toBe(href);
    expect(page.url()).toBe(originalUrl);
    await tab.close();
  }
});

test("article contents links follow reading position and preserve native anchors", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({
    width: testInfo.project.name === "desktop" ? 1440 : 390,
    height: 844,
  });
  await page.goto(articlePath);
  await page.evaluate(() => globalThis.document.fonts.ready);
  const toc = page.locator("[data-article-toc]");
  const details = toc.locator("details");
  if (testInfo.project.name === "mobile") {
    await expect(details).not.toHaveAttribute("open", "");
    await expect(toc.getByRole("link").first()).toBeHidden();
    const summary = toc.locator("summary");
    const prose = await page.locator("[data-article-body]").boundingBox();
    const bounds = await summary.boundingBox();
    expect(bounds).not.toBeNull();
    expect(prose).not.toBeNull();
    if (bounds && prose) expect(bounds.y).toBeLessThan(prose.y);
    await summary.click();
    await page.setViewportSize({ width: 390, height: 740 });
    await expect(details).toHaveAttribute("open", "");
  }
  const nav = toc.locator('nav[aria-label="目次"]');
  const headings = page.locator("[data-article-body] :is(h2, h3)[id]");
  const links = nav.locator("a");
  expect(await links.count()).toBe(await headings.count());
  await expect(nav.locator('[aria-current="location"]')).toHaveCount(1);
  await expect(links.first()).toHaveAttribute("aria-current", "location");
  const target = links.nth(3);
  const href = await target.getAttribute("href");
  expect(href).toBeTruthy();
  await target.click();
  await expect
    .poll(() => decodeURIComponent(new globalThis.URL(page.url()).hash))
    .toBe(href);
  await expect(target).toHaveAttribute("aria-current", "location");
  await expect
    .poll(async () => (await headings.nth(3).boundingBox())?.y)
    .toBeGreaterThanOrEqual(100);
  await page.reload();
  await expect(target).toHaveAttribute("aria-current", "location");
  for (const index of [1, 5, 2, 0]) {
    await headings.nth(index).evaluate((heading) => {
      const line =
        Number.parseFloat(
          globalThis.getComputedStyle(globalThis.document.documentElement)
            .fontSize,
        ) * 7;
      globalThis.scrollTo({
        top:
          heading.getBoundingClientRect().top + globalThis.scrollY - line + 2,
        behavior: "instant",
      });
    });
    await expect(links.nth(index)).toHaveAttribute("aria-current", "location");
    await expect(nav.locator('[aria-current="location"]')).toHaveCount(1);
  }
  await headings.nth(2).evaluate((heading) => {
    const line =
      Number.parseFloat(
        globalThis.getComputedStyle(globalThis.document.documentElement)
          .fontSize,
      ) * 7;
    globalThis.scrollTo({
      top: heading.getBoundingClientRect().top + globalThis.scrollY - line - 30,
      behavior: "instant",
    });
  });
  await expect(links.nth(1)).toHaveAttribute("aria-current", "location");
  await page.evaluate(() =>
    globalThis.scrollTo({
      top: globalThis.document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await expect(links.last()).toHaveAttribute("aria-current", "location");
});

test("desktop contents fit the right gutter and stay below the header", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto(articlePath);
  for (const [width, fontSize] of [
    [1408, "normal"],
    [1552, "large"],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate((value) => {
      globalThis.document.documentElement.dataset.fontSize = value;
      globalThis.scrollTo({ top: 1000, behavior: "instant" });
    }, fontSize);
    const nav = page.getByRole("navigation", { name: "目次" });
    await expect(nav).toBeVisible();
    const prose = await page.locator("[data-article-body]").boundingBox();
    const bounds = await nav.boundingBox();
    expect(bounds).not.toBeNull();
    expect(prose).not.toBeNull();
    if (bounds && prose) {
      expect(bounds.x).toBeGreaterThan(prose.x + prose.width);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(prose.x + prose.width / 2).toBeCloseTo(width / 2, 0);
    }
    const stickyTop = await page
      .locator("[data-article-toc] details")
      .evaluate((element) =>
        Number.parseFloat(globalThis.getComputedStyle(element).top),
      );
    await expect
      .poll(async () => (await nav.boundingBox())?.y)
      .toBeCloseTo(stickyTop, 0);
    await page.evaluate(() =>
      globalThis.scrollTo({ top: 2000, behavior: "instant" }),
    );
    await expect
      .poll(async () => (await nav.boundingBox())?.y)
      .toBeCloseTo(stickyTop, 0);
    expect(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth -
          globalThis.document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1408, height: 844 });
  await expect(page.locator("[data-article-toc] details")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator("[data-article-toc] summary")).toBeVisible();
});

test("long contents keep the active entry visible without moving the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 480 });
  await page.goto(articlePath);
  await page.evaluate(() => globalThis.document.fonts.ready);
  const nav = page.getByRole("navigation", { name: "目次" });
  const lastLink = nav.getByRole("link").last();
  await page.evaluate(() =>
    globalThis.scrollTo({
      top: globalThis.document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await expect(lastLink).toHaveAttribute("aria-current", "location");
  await expect
    .poll(async () => {
      const bounds = await lastLink.boundingBox();
      const viewport = await nav.boundingBox();
      return Boolean(
        bounds &&
        viewport &&
        bounds.y >= viewport.y - 1 &&
        bounds.y + bounds.height <= viewport.y + viewport.height + 1,
      );
    })
    .toBe(true);
  expect(
    await page.evaluate(
      () =>
        Math.ceil(globalThis.scrollY + globalThis.innerHeight) >=
        globalThis.document.documentElement.scrollHeight - 1,
    ),
  ).toBe(true);
});

for (const path of ["/blog/20260224-diary", "/works/20260129-taiyaq"]) {
  test(`${path} exposes accessible contents`, async ({ page }) => {
    await page.goto(path);
    const toc = page.locator("[data-article-toc]");
    await toc.locator("summary").click();
    await expect(toc.getByRole("navigation", { name: "目次" })).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).include("[data-article-toc]").analyze())
        .violations,
    ).toEqual([]);
  });
}

test("articles without section headings omit the contents", async ({
  page,
}) => {
  await page.goto("/blog/20260118-homepage");
  await expect(page.locator("[data-article-toc]")).toHaveCount(0);
});

test("contents anchors remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4323${articlePath}`);
    const links = page
      .getByRole("navigation", { name: "目次" })
      .getByRole("link");
    await expect(links.first()).toBeVisible();
    const href = await links.nth(1).getAttribute("href");
    await links.nth(1).click();
    await expect
      .poll(() => decodeURIComponent(new globalThis.URL(page.url()).hash))
      .toBe(href);
  } finally {
    await context.close();
  }
});
