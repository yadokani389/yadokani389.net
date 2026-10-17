import assert from "node:assert/strict";
import { test } from "node:test";
import process from "node:process";
import config from "../cloudflare.config.ts";

test("deployment modes preserve production domains and isolate preview Workers", (t) => {
  const previous = process.env.CLOUDFLARE_PREVIEW_NUMBER;
  t.after(() => {
    if (previous === undefined) delete process.env.CLOUDFLARE_PREVIEW_NUMBER;
    else process.env.CLOUDFLARE_PREVIEW_NUMBER = previous;
  });

  const production = config({ mode: "production", isPreview: false }).worker;
  assert.equal(production.name, "yadokani389-net");
  assert.deepEqual(production.domains, [
    "yadokani389.net",
    "www.yadokani389.net",
  ]);
  assert.equal(production.assets.notFoundHandling, "404-page");
  assert.throws(
    () => config({ mode: "typo", isPreview: false }),
    /Unsupported/,
  );

  delete process.env.CLOUDFLARE_PREVIEW_NUMBER;
  assert.throws(() => config({ mode: "preview", isPreview: false }), /valid/);
  process.env.CLOUDFLARE_PREVIEW_NUMBER = "123";
  const preview = config({ mode: "preview", isPreview: false }).worker;
  assert.equal(preview.name, "yadokani389-net-preview-123");
  assert.deepEqual(preview.domains, []);
  process.env.CLOUDFLARE_PREVIEW_NUMBER = "123/invalid";
  assert.throws(() => config({ mode: "preview", isPreview: false }), /valid/);
});
