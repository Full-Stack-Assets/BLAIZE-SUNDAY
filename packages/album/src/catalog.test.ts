import assert from "node:assert/strict";
import test from "node:test";
import { TRACKS, requiredDeliverables } from "./catalog.ts";

test("catalog contains exactly the approved ten tracks", () => {
  assert.equal(TRACKS.length, 10);
  assert.equal(TRACKS[0]?.id, "01_LOOKS_EXPENSIVE");
  assert.equal(TRACKS[9]?.id, "10_WRONG_FLOOR");
  assert.equal(requiredDeliverables(TRACKS[0]!).length, 18);
});
