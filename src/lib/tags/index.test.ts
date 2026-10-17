import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTagIndex, getEntriesByTagName } from "./index.ts";
import { toTagSlug } from "./slug.ts";

test("tag counts match entries despite blank, repeated, or differently cased tags", () => {
  const entries = [
    { data: { tags: [" Rust ", "rust", "日本語", " "] } },
    { data: { tags: ["RUST"] } },
    { data: {} },
  ];
  assert.deepEqual(buildTagIndex(entries), [
    { slug: "rust", name: "Rust", count: 2 },
    { slug: "日本語", name: "日本語", count: 1 },
  ]);
  assert.deepEqual(getEntriesByTagName(entries, " RUST "), entries.slice(0, 2));
  assert.deepEqual(getEntriesByTagName(entries, "missing"), []);
});

test("tag slugs normalize width and separators and reject ambiguous names", () => {
  assert.equal(toTagSlug(" ＡＩ__ tools "), "ai-tools");
  assert.throws(() => toTagSlug("#@"), /Unable to build tag slug/);
  assert.throws(
    () => buildTagIndex([{ data: { tags: ["C++", "C#"] } }]),
    /Tag slug collision/,
  );
});
