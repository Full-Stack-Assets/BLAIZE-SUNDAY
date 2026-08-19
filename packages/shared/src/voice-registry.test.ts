import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCanonicalVoice,
  SUNDAY_AFTER_MIDNIGHT_B3,
  VoiceIdentityGateError
} from "./voice-registry.ts";

test("B3 resolves for audition use", () => {
  const result = resolveCanonicalVoice(SUNDAY_AFTER_MIDNIGHT_B3, "AUDITION");

  assert.equal(result.voiceIdentityId, "blaize-sunday/sunday-after-midnight");
  assert.equal(result.provider, "heygen");
  assert.equal(result.providerVoiceId, "10863794b2454eaa8781f377939d6f14");
  assert.equal(result.verificationStatus, "G2_FINALIST");
});

test("B3 resolves for internal preview use", () => {
  const result = resolveCanonicalVoice(
    SUNDAY_AFTER_MIDNIGHT_B3,
    "INTERNAL_PREVIEW"
  );

  assert.equal(result.use, "INTERNAL_PREVIEW");
});

test("B3 fails closed for production release before G2 lock", () => {
  assert.throws(
    () => resolveCanonicalVoice(SUNDAY_AFTER_MIDNIGHT_B3, "PRODUCTION_RELEASE"),
    (error: unknown) => {
      assert.ok(error instanceof VoiceIdentityGateError);
      assert.match(error.message, /not LOCKED/);
      return true;
    }
  );
});

test("locked production voice still requires commercial continuity", () => {
  assert.throws(
    () =>
      resolveCanonicalVoice(
        {
          ...SUNDAY_AFTER_MIDNIGHT_B3,
          verificationStatus: "LOCKED"
        },
        "PRODUCTION_RELEASE"
      ),
    (error: unknown) => {
      assert.ok(error instanceof VoiceIdentityGateError);
      assert.match(error.message, /commercial continuity/);
      return true;
    }
  );
});

test("locked and commercially verified voice resolves for production", () => {
  const result = resolveCanonicalVoice(
    {
      ...SUNDAY_AFTER_MIDNIGHT_B3,
      verificationStatus: "LOCKED",
      commercialContinuity: "VERIFIED"
    },
    "PRODUCTION_RELEASE"
  );

  assert.equal(result.use, "PRODUCTION_RELEASE");
  assert.equal(result.verificationStatus, "LOCKED");
});
