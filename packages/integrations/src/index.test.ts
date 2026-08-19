import assert from "node:assert/strict";
import test from "node:test";

import { inspectIntegrations } from "./index.ts";

test("missing providers are UNCONFIGURED rather than CONNECTED", () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const eleven = inspectIntegrations().find((item) => item.id === "elevenlabs");
  assert.equal(eleven?.status, "UNCONFIGURED");
  if (previous) process.env.ELEVENLABS_API_KEY = previous;
});
