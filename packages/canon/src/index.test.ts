import assert from "node:assert/strict";
import test from "node:test";

import { nextProofCycleTitle } from "./index.ts";

test("proof cycle advances to the next unused single", () => {
  assert.equal(nextProofCycleTitle([]), "LOOKS EXPENSIVE");
  assert.equal(nextProofCycleTitle(["LOOKS EXPENSIVE"]), "MY THERAPIST BLOCKED ME");
});
