import assert from "node:assert/strict";
import test from "node:test";

import { hashPayload, stableStringify } from "./domain.ts";

test("stableStringify produces identical JSON for equivalent key orderings", () => {
  const left = stableStringify({ z: 1, nested: { b: 2, a: 1 } });
  const right = stableStringify({ nested: { a: 1, b: 2 }, z: 1 });

  assert.equal(left, right);
});

test("stableStringify preserves array order", () => {
  assert.match(stableStringify({ values: [3, 1, 2] }), /\[3,1,2\]/);
});

test("hashPayload hashes equivalent payloads identically", () => {
  assert.equal(hashPayload({ b: 2, a: 1 }), hashPayload({ a: 1, b: 2 }));
});
