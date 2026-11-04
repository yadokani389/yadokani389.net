import assert from "node:assert/strict";
import { test } from "node:test";
import { formatOgText } from "./text.ts";

test("OG text allows breaks between BudouX phrases and keeps graphemes together", () => {
  assert.equal(
    formatOgText("今日はとても天気がいいです。"),
    "今\u2060日\u2060は\u200bと\u2060て\u2060も\u200b天\u2060気\u2060が\u200bい\u2060い\u2060で\u2060す\u2060。",
  );
  for (const text of ["", "Astro OGP", "👨‍👩‍👧‍👦とが\n次の行"])
    assert.equal(formatOgText(text).replace(/[\u200b\u2060]/g, ""), text);
  assert.ok(formatOgText("👨‍👩‍👧‍👦とが").includes("👨‍👩‍👧‍👦"));
  assert.ok(formatOgText("が").includes("が"));
});
