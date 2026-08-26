import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUTENOTE_CONTROL_COOKIE,
  createRouteNoteAuthorityCookie,
  routeNoteAuthorityRequired,
  verifyRouteNoteAuthority,
  verifyRouteNotePassphrase
} from "./routenote-authority.server.ts";

const productionEnv = {
  NODE_ENV: "production",
  ROUTENOTE_CONTROL_PASSPHRASE: "correct horse battery staple"
} as NodeJS.ProcessEnv;
const nowSeconds = 1_787_728_400;

test("production RouteNote controls require an explicitly configured owner secret", () => {
  assert.equal(routeNoteAuthorityRequired(productionEnv), true);
  assert.equal(
    routeNoteAuthorityRequired({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    true
  );
});

test("local development may operate without a separate unlock secret", () => {
  assert.equal(
    routeNoteAuthorityRequired({ NODE_ENV: "development" } as NodeJS.ProcessEnv),
    false
  );
});

test("owner passphrase comparison accepts only the configured secret", () => {
  assert.equal(verifyRouteNotePassphrase("correct horse battery staple", productionEnv), true);
  assert.equal(verifyRouteNotePassphrase("wrong", productionEnv), false);
  assert.equal(verifyRouteNotePassphrase("", productionEnv), false);
});

test("authority cookie is HttpOnly, SameSite Strict, and contains no plaintext passphrase", () => {
  const cookie = createRouteNoteAuthorityCookie(productionEnv, 43_200, nowSeconds);

  assert.match(cookie, new RegExp(`^${ROUTENOTE_CONTROL_COOKIE}=`));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /Max-Age=43200/i);
  assert.equal(cookie.includes("correct horse battery staple"), false);
});

test("signed cookie verifies only with the current configured secret", () => {
  const cookie = createRouteNoteAuthorityCookie(productionEnv, 43_200, nowSeconds);

  assert.equal(verifyRouteNoteAuthority(cookie, productionEnv, nowSeconds + 10), true);
  assert.equal(
    verifyRouteNoteAuthority(
      cookie,
      {
        NODE_ENV: "production",
        ROUTENOTE_CONTROL_PASSPHRASE: "different secret"
      } as NodeJS.ProcessEnv,
      nowSeconds + 10
    ),
    false
  );
  assert.equal(verifyRouteNoteAuthority("", productionEnv, nowSeconds), false);
});

test("signed authority token fails after its cryptographic expiry even if replayed manually", () => {
  const cookie = createRouteNoteAuthorityCookie(productionEnv, 60, nowSeconds);

  assert.equal(verifyRouteNoteAuthority(cookie, productionEnv, nowSeconds + 59), true);
  assert.equal(verifyRouteNoteAuthority(cookie, productionEnv, nowSeconds + 61), false);
});

test("tampering with authority expiry or signature fails closed", () => {
  const cookie = createRouteNoteAuthorityCookie(productionEnv, 60, nowSeconds);
  const tamperedExpiry = cookie.replace(
    String(nowSeconds + 60),
    String(nowSeconds + 60_000)
  );
  assert.equal(verifyRouteNoteAuthority(tamperedExpiry, productionEnv, nowSeconds + 10), false);

  const tamperedSignature = cookie.replace(/([a-f0-9])(?=; Path=)/, match =>
    match === "a" ? "b" : "a"
  );
  assert.equal(verifyRouteNoteAuthority(tamperedSignature, productionEnv, nowSeconds + 10), false);
});

test("development without a configured secret is implicitly authorized", () => {
  const env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
  assert.equal(verifyRouteNoteAuthority("", env, nowSeconds), true);
});

test("production without a configured secret fails closed", () => {
  const env = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
  assert.equal(verifyRouteNotePassphrase("anything", env), false);
  assert.equal(verifyRouteNoteAuthority("", env, nowSeconds), false);
  assert.throws(
    () => createRouteNoteAuthorityCookie(env, 43_200, nowSeconds),
    (error: unknown) => {
      assert.equal(
        (error as { code?: string }).code,
        "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED"
      );
      return true;
    }
  );
});
