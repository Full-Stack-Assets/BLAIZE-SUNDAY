import assert from "node:assert/strict";
import test from "node:test";

import {
  createCreativeField,
  resolveCreativeField,
  type CreativeField
} from "./creative-field.ts";

test("blank input preserves the autonomous AI_DECIDES default", () => {
  assert.deepEqual(createCreativeField("concept", "Concept", undefined), {
    key: "concept",
    label: "Concept",
    state: "AI_DECIDES",
    value: null
  });
});

test("locked and user values take precedence over generated values", () => {
  const generated: CreativeField<string> = {
    key: "genre",
    label: "Genre",
    state: "AI_DECIDES",
    value: null,
    aiGeneratedValue: "Luxury glitch pop"
  };
  assert.equal(resolveCreativeField(generated), "Luxury glitch pop");
  assert.equal(
    resolveCreativeField({ ...generated, state: "USER_OVERRIDE", userValue: "Alt pop" }),
    "Alt pop"
  );
  assert.equal(
    resolveCreativeField({ ...generated, state: "LOCKED", lockedValue: "Canon pop" }),
    "Canon pop"
  );
});
