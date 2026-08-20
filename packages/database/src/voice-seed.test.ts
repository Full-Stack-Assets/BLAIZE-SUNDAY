import assert from "node:assert/strict";
import test from "node:test";

import {
  D1_REFERENCE_ASSET,
  SUNDAY_AFTER_MIDNIGHT_D1,
  buildD1VoiceProfileSeed,
  mergeApprovedReferenceAssets
} from "./voice-seed.ts";

test("D1 seed uses the persisted ElevenLabs provider voice id without claiming G2 lock", () => {
  assert.equal(SUNDAY_AFTER_MIDNIGHT_D1.providerVoiceId, "j9nOYxfwt3sxAi32BnNI");
  assert.equal(SUNDAY_AFTER_MIDNIGHT_D1.status, "D1_PERSISTED_G2_PENDING");
  assert.equal(SUNDAY_AFTER_MIDNIGHT_D1.g2Locked, false);
  const profile = buildD1VoiceProfileSeed([]);
  assert.equal(profile.canonicalVoiceId, "j9nOYxfwt3sxAi32BnNI");
  assert.equal(profile.provider, "elevenlabs");
});

test("reference merge preserves historical B3 evidence and de-duplicates D1", () => {
  const existing = [
    { candidate: "B3", providerVoiceId: "10863794b2454eaa8781f377939d6f14", historical: true },
    { candidate: "D1", providerVoiceId: "old-d1", stale: true }
  ];
  const merged = mergeApprovedReferenceAssets(existing);
  assert.equal(merged.length, 2);
  assert.equal((merged[0] as Record<string, unknown>).candidate, "B3");
  assert.deepEqual(merged[1], D1_REFERENCE_ASSET);
});
