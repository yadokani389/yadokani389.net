import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/blog", "/works", "/about", "/search"]) {
  test(`${path} renders without accessibility or browser errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/yadokani389/);
    await page.evaluate(() => globalThis.document.fonts.ready);
    expect(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth -
          globalThis.document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("search finds Japanese text, filters content, and restores URL state", async ({
  page,
}) => {
  await page.goto("/search?q=ホームページ&type=blog");
  const input = page.getByRole("searchbox");
  await expect(input).toHaveValue("ホームページ");
  const results = page.locator(".results-list");
  await expect(
    results.getByRole("link", { name: /ホームページ作りました/ }),
  ).toBeVisible();
  await input.fill("rust");
  await page.getByRole("button", { name: /^Works/ }).click();
  await expect(page.locator(".search-status")).toHaveText(/^[1-9]\d*件$/);
  await expect(results.locator(".kind-pill--blog")).toHaveCount(0);
  await expect(results.locator(".kind-pill--works").first()).toBeVisible();
  await expect(page).toHaveURL(/q=rust&type=works/);
  await page.reload();
  await expect(input).toHaveValue("rust");
  await expect(page.getByRole("button", { name: /^Works/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(results.locator(".kind-pill--works").first()).toBeVisible();
  await input.fill("no-such-entry-438193");
  await expect(
    page.getByText("一致する結果はありません。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "検索語をクリア" }).click();
  await expect(
    page.getByRole("heading", { name: "最近の公開内容" }),
  ).toBeVisible();
  await expect(input).toBeFocused();
});

for (const kind of ["blog", "works"]) {
  test(`${kind} tag links lead to an archive and article`, async ({ page }) => {
    await page.goto(`/${kind}`);
    await page.locator(`a[href^="/${kind}/tags/"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/${kind}/tags/`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^#/);
    await page.locator(".card-title-link").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-pagefind-body]")).toBeVisible();
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
    const image = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(image).toBeTruthy();
    const response = await page.request.get(
      new globalThis.URL(image!).pathname,
    );
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
}

test("theme and font size survive navigation and reload", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-theme-picker] summary").click();
  await page.locator('[data-theme-value="light"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("[data-font-size-picker] summary").click();
  await page.locator('[data-font-size-value="large"]').click();
  await page.goto("/blog");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-font-size", "large");
});

for (const theme of ["light", "dark", "dim"]) {
  test(`search results remain accessible in ${theme} mode`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      globalThis.localStorage.setItem("theme-preference", value);
    }, theme);
    await page.goto("/search?q=rust");
    await expect(
      page.locator(".results-list .result-link").first(),
    ).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });
}

test("header controls fit at 320px with enlarged text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    globalThis.localStorage.setItem("font-size-preference", "large");
  });
  await page.goto("/");
  const theme = page.locator("[data-theme-picker] summary");
  await theme.click();
  await page.keyboard.press("Escape");
  await expect(theme).toBeFocused();
  await expect(page.locator("[data-theme-picker]")).not.toHaveAttribute(
    "open",
    "",
  );
  expect(
    await page.evaluate(
      () =>
        globalThis.document.documentElement.scrollWidth -
        globalThis.document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const controls = await page
    .locator("header summary, header a[href='/search']")
    .all();
  for (const control of controls) {
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
});

test("mobile menu responds to keyboard and outside clicks", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  const menu = page.locator("[data-mobile-menu]");
  await page.getByLabel("メニューを開く").click();
  await expect(menu).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await page.getByLabel("メニューを開く").click();
  await page.getByRole("heading", { name: "Blog", exact: true }).click();
  await expect(menu).not.toHaveAttribute("open", "");
  await page.getByLabel("メニューを開く").click();
  await page
    .getByRole("navigation", { name: "Main mobile" })
    .getByRole("link", { name: "Works" })
    .click();
  await expect(page).toHaveURL(/\/works\/?$/);
});

test("missing pages return a usable 404", async ({ page }) => {
  const response = await page.goto("/no-such-page-438193");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("404");
  await expect(
    page.getByRole("link", { name: "トップページへ" }),
  ).toBeVisible();
});
