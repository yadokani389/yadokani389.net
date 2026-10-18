import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../cloudflare.config.ts";

test("Worker Previews share the Worker name and keep production domains isolated", () => {
  const production = config({ mode: "production", isPreview: false }).worker;
  assert.equal(production.name, "yadokani389-net");
  assert.deepEqual(production.domains, [
    "yadokani389.net",
    "www.yadokani389.net",
  ]);
  assert.equal(production.assets.notFoundHandling, "404-page");
  assert.equal(production.previewUrls, false);
  assert.throws(
    () => config({ mode: "typo", isPreview: false }),
    /Unsupported/,
  );

  assert.throws(
    () => config({ mode: "preview", isPreview: false }),
    /CLOUDFLARE_PREVIEW_BUILD/,
  );
  const preview = config({ mode: "preview", isPreview: true }).worker;
  assert.equal(preview.name, production.name);
  assert.deepEqual(preview.domains, []);
  assert.equal(preview.previewUrls, true);
});
