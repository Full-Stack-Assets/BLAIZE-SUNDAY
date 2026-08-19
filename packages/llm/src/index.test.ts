import assert from "node:assert/strict";
import test from "node:test";

import { LlmConfigurationError, requireLiveKey } from "./index.ts";

test("live key is required and never reads a client-supplied secret", () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GROK_API_KEY;
  assert.throws(() => requireLiveKey(), LlmConfigurationError);
  if (previous) process.env.OPENAI_API_KEY = previous;
});
