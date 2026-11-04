import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("share icons have hover labels and follow scrolling only on wide screens", async ({
  page,
  context,
}, testInfo) => {
  const wide = testInfo.project.name === "desktop";
  await page.setViewportSize({ width: wide ? 1280 : 390, height: 844 });
  if (wide) {
    await page.addInitScript(() => {
      globalThis.localStorage.setItem("font-size-preference", "large");
    });
  }
  await page.goto("/works/20260129-taiyaq");
  const share = page.locator('[data-share-actions="inline"]');
  for (const name of ["Xで共有", "リンクをコピー"]) {
    const action = share.getByRole(name === "Xで共有" ? "link" : "button", {
      name,
    });
    await expect(action).toHaveAttribute("title", name);
    await expect(action.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    expect((await action.innerText()).trim()).toBe("");
    const bounds = await action.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBe(bounds!.width);
    expect(
      await action.evaluate((element) =>
        Number.parseFloat(globalThis.getComputedStyle(element).borderRadius),
      ),
    ).toBeGreaterThanOrEqual(bounds!.width / 2);
  }
  const prose = await page.locator(".prose").boundingBox();
  const inlineActions = await share.locator(".share-action:visible").all();
  const firstAction = await inlineActions[0].boundingBox();
  const secondAction = await inlineActions[1].boundingBox();
  expect(secondAction!.x - firstAction!.x - firstAction!.width).toBeCloseTo(0);
  const lastInline = await share
    .locator(".share-action:visible")
    .last()
    .boundingBox();
  expect(lastInline!.x + lastInline!.width).toBeCloseTo(
    prose!.x + prose!.width,
    0,
  );
  const inlineButtons = await share.locator(".share-buttons").boundingBox();
  expect(inlineButtons!.y).toBeGreaterThanOrEqual(prose!.y + prose!.height);
  const side = page.locator('[data-share-actions="side"]');
  if (!wide) {
    await expect(side).toBeHidden();
    expect(inlineButtons!.x + inlineButtons!.width).toBeLessThanOrEqual(390);
    return;
  }
  const buttons = side.locator(".share-buttons");
  const before = await buttons.boundingBox();
  expect(before!.x).toBeGreaterThanOrEqual(0);
  expect(before!.x + before!.width).toBeLessThan(prose!.x);
  await page.evaluate(() =>
    globalThis.scrollTo({ top: 500, behavior: "instant" }),
  );
  const stickyTop = await side
    .locator(".share-controls")
    .evaluate((element) =>
      Number.parseFloat(globalThis.getComputedStyle(element).top),
    );
  await expect
    .poll(async () => (await buttons.boundingBox())!.y)
    .toBeCloseTo(stickyTop, 1);
  await page.evaluate(() =>
    globalThis.scrollTo({ top: 1000, behavior: "instant" }),
  );
  await expect
    .poll(async () => (await buttons.boundingBox())!.y)
    .toBeCloseTo(stickyTop, 1);
  const header = await page.locator("body > header").boundingBox();
  expect(stickyTop - (header!.y + header!.height)).toBeGreaterThanOrEqual(24);
  expect(stickyTop - (header!.y + header!.height)).toBeLessThanOrEqual(64);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await side.getByRole("button", { name: "リンクをコピー" }).click();
  await expect(side.getByRole("status")).toHaveText("リンクをコピーしました");
  await expect(share.getByRole("status")).toBeEmpty();
  for (const [width, fontSize] of [
    [1040, "normal"],
    [1152, "large"],
  ] as const) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate((value) => {
      globalThis.document.documentElement.dataset.fontSize = value;
    }, fontSize);
    await expect(side).toBeVisible();
    const bounds = await buttons.boundingBox();
    const content = await page.locator(".prose").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThan(content!.x);
  }
});

for (const path of ["/blog/20260118-homepage", "/works/20260129-taiyaq"]) {
  test(`${path} shares the canonical URL and copies it to the clipboard`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`${path}?ref=test#main`);
    expect(response?.status()).toBe(200);
    const title = await page.getByRole("heading", { level: 1 }).innerText();
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(canonical).toBe(`https://yadokani389.net${path}/`);
    const share = page.locator('[data-share-actions="inline"]');
    const xLink = share.getByRole("link", { name: "Xで共有" });
    const xUrl = new globalThis.URL((await xLink.getAttribute("href"))!);
    expect(xUrl.origin + xUrl.pathname).toBe("https://x.com/intent/tweet");
    expect(xUrl.searchParams.get("text")).toBe(title);
    expect(xUrl.searchParams.get("url")).toBe(canonical);
    for (const icon of await page.locator("svg[data-icon]:visible").all()) {
      expect(
        await icon.evaluate(
          (element) => (element as globalThis.SVGSVGElement).getBBox().width,
        ),
      ).toBeGreaterThan(0);
    }
    await share.getByRole("button", { name: "リンクをコピー" }).click();
    await expect(share.getByRole("status")).toHaveText(
      "リンクをコピーしました",
    );
    expect(
      await page.evaluate(() => globalThis.navigator.clipboard.readText()),
    ).toBe(canonical);
    expect(
      (await new AxeBuilder({ page }).include("[data-share-actions]").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          globalThis.document.documentElement.scrollWidth -
          globalThis.document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

for (const outcome of ["success", "AbortError", "NotAllowedError"]) {
  test(`native sharing handles ${outcome}`, async ({ page }) => {
    await page.addInitScript((result) => {
      Object.defineProperty(globalThis.navigator, "share", {
        value: async (data: globalThis.ShareData) => {
          globalThis.document.documentElement.dataset.shared =
            JSON.stringify(data);
          if (result !== "success")
            throw new globalThis.DOMException("Share failed", result);
        },
      });
    }, outcome);
    await page.goto("/blog/20260118-homepage?ref=test#main");
    const share = page.locator('[data-share-actions="inline"]');
    const button = share.getByRole("button", { name: "その他の共有" });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute(
      "data-shared",
      JSON.stringify({
        title: await page.getByRole("heading", { level: 1 }).innerText(),
        url: "https://yadokani389.net/blog/20260118-homepage/",
      }),
    );
    await expect(button).toBeEnabled();
    await expect(share.getByRole("status")).toHaveText(
      outcome === "NotAllowedError"
        ? "共有できませんでした。再度お試しください。"
        : "",
    );
  });
}

test("copy failure is announced and can be retried", async ({ page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: {
        writeText: async () => {
          if (attempts++ === 0)
            throw new globalThis.DOMException("Denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/works/20260129-taiyaq");
  const share = page.locator('[data-share-actions="inline"]');
  const button = share.getByRole("button", { name: "リンクをコピー" });
  await button.click();
  await expect(share.getByRole("status")).toHaveText(
    "コピーできませんでした。アドレスバーからURLをコピーしてください。",
  );
  await expect(button).toBeEnabled();
  await button.click();
  await expect(share.getByRole("status")).toHaveText("リンクをコピーしました");
});

test("unsupported APIs leave the X sharing link usable", async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ["share", "clipboard"]) {
      Object.defineProperty(globalThis.navigator, name, { value: undefined });
    }
  });
  await page.goto("/works/20260129-taiyaq");
  const share = page.locator('[data-share-actions="inline"]');
  await expect(share.getByRole("link", { name: "Xで共有" })).toBeVisible();
  await expect(share.getByRole("button")).toHaveCount(0);
});

test("X sharing works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4323/blog/20260118-homepage");
  const share = page.locator('[data-share-actions="inline"]');
  await expect(share.getByRole("link", { name: "Xで共有" })).toHaveAttribute(
    "href",
    /^https:\/\/x\.com\/intent\/tweet\?/,
  );
  await expect(share.getByRole("button")).toHaveCount(0);
  await context.close();
});
