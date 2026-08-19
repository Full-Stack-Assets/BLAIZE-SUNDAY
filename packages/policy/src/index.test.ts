import assert from "node:assert/strict";
import test from "node:test";

import { assertPaidCallAllowed, requiresHumanI4 } from "./index.ts";

test("zero-cost budget blocks paid provider calls", () => {
  const previous = process.env.MONTHLY_BUDGET_USD;
  process.env.MONTHLY_BUDGET_USD = "0";
  assert.throws(() => assertPaidCallAllowed(0.02), /BLOCKED_BUDGET/);
  assertPaidCallAllowed(0);
  if (previous === undefined) delete process.env.MONTHLY_BUDGET_USD;
  else process.env.MONTHLY_BUDGET_USD = previous;
});

test("buyer contact is an I4 action", () => {
  assert.equal(requiresHumanI4("buyer_contact"), true);
  assert.equal(requiresHumanI4("prepare"), false);
});
