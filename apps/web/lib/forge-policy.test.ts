import assert from "node:assert/strict";
import test from "node:test";

import { decideForgeExecution } from "./forge-policy.ts";

test("live forge fails closed when no server key is configured", () => {
  const previousMode = process.env.SONGFORGE_MODE;
  const previousOpen = process.env.OPENAI_API_KEY;
  const previousGrok = process.env.GROK_API_KEY;
  process.env.SONGFORGE_MODE = "live";
  delete process.env.OPENAI_API_KEY;
  delete process.env.GROK_API_KEY;

  const decision = decideForgeExecution();
  assert.equal(decision.kind, "blocked");
  if (decision.kind === "blocked") {
    assert.equal(decision.error, "BLOCKED_CONFIGURATION");
    assert.equal(decision.source, "none");
  }

  if (previousMode === undefined) delete process.env.SONGFORGE_MODE;
  else process.env.SONGFORGE_MODE = previousMode;
  if (previousOpen) process.env.OPENAI_API_KEY = previousOpen;
  else delete process.env.OPENAI_API_KEY;
  if (previousGrok) process.env.GROK_API_KEY = previousGrok;
  else delete process.env.GROK_API_KEY;
});

test("test mode uses the labeled local engine", () => {
  const previousMode = process.env.SONGFORGE_MODE;
  process.env.SONGFORGE_MODE = "test";
  const decision = decideForgeExecution();
  assert.equal(decision.kind, "simulated");
  if (previousMode === undefined) delete process.env.SONGFORGE_MODE;
  else process.env.SONGFORGE_MODE = previousMode;
});
