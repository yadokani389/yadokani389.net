import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSearchUrl,
  mergeSearchEntries,
  readSearchState,
} from "./model.ts";
import { buildSearchQueries } from "./query.ts";

test("search URL state validates filters and preserves other parameters and anchors", () => {
  assert.deepEqual(readSearchState("?q=%20日本語%20&type=works"), {
    query: "日本語",
    type: "works",
  });
  assert.deepEqual(readSearchState("?type=unknown"), {
    query: "",
    type: "all",
  });
  assert.equal(
    buildSearchUrl(
      "https://example.com/search?ref=home&q=old&type=blog#results",
      " rust ",
      "works",
    ),
    "/search?ref=home&q=rust&type=works#results",
  );
  assert.equal(
    buildSearchUrl(
      "https://example.com/search?q=old&type=works#results",
      " ",
      "all",
    ),
    "/search#results",
  );
});

test("search queries normalize whitespace and merged variants keep each result once", () => {
  assert.deepEqual(buildSearchQueries(" \n "), []);
  assert.deepEqual(buildSearchQueries(" rust  wasm "), ["rust wasm"]);
  const japanese = buildSearchQueries("日本語検索");
  assert.equal(japanese[0], "日本語検索");
  assert.equal(new Set(japanese).size, japanese.length);
  const entry = (id: string) => ({
    id,
    data: async () => ({ url: `/blog/${id}`, meta: { title: id } }),
  });
  const first = entry("first");
  const second = entry("second");
  assert.deepEqual(
    mergeSearchEntries([
      { results: [first] },
      { results: [entry("first"), second] },
    ]),
    [first, second],
  );
});
