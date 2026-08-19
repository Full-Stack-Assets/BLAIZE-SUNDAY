import assert from "node:assert/strict";
import test from "node:test";

import { canProjectTransition } from "./project-state-machine.ts";

test("project workflow allows forward progress and explicit QA revision", () => {
  assert.equal(canProjectTransition("IDEA", "STRATEGY"), true);
  assert.equal(canProjectTransition("STRATEGY", "WRITING"), true);
  assert.equal(canProjectTransition("MASTERING", "SELECTED"), true);
  assert.equal(canProjectTransition("QA", "MIXING"), true);
  assert.equal(canProjectTransition("WRITING", "LIVE" as never), false);
});
