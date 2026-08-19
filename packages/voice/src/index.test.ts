import assert from "node:assert/strict";
import test from "node:test";

import { inspectCanonicalVoice } from "./index.ts";

test("placeholder voice is UNCONFIGURED and never ACTIVE", () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const voice = inspectCanonicalVoice({ providerVoiceId: null });
  assert.equal(voice.status, "UNCONFIGURED");
  assert.equal(voice.consistency, "UNVERIFIED");
  if (previous) process.env.ELEVENLABS_API_KEY = previous;
});
