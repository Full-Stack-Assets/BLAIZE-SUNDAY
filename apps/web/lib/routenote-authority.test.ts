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
  const cookie = createRouteNoteAuthorityCookie(productionEnv, 43_200);

  assert.match(cookie, new RegExp(`^${ROUTENOTE_CONTROL_COOKIE}=`));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /Max-Age=43200/i);
  assert.equal(cookie.includes("correct horse battery staple"), false);
});

test("signed cookie verifies only with the current configured secret", () => {
  const cookie = createRouteNoteAuthorityCookie(productionEnv, 43_200);

  assert.equal(verifyRouteNoteAuthority(cookie, productionEnv), true);
  assert.equal(
    verifyRouteNoteAuthority(
      cookie,
      {
        NODE_ENV: "production",
        ROUTENOTE_CONTROL_PASSPHRASE: "different secret"
      } as NodeJS.ProcessEnv
    ),
    false
  );
  assert.equal(verifyRouteNoteAuthority("", productionEnv), false);
});

test("development without a configured secret is implicitly authorized", () => {
  const env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
  assert.equal(verifyRouteNoteAuthority("", env), true);
});

test("production without a configured secret fails closed", () => {
  const env = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
  assert.equal(verifyRouteNotePassphrase("anything", env), false);
  assert.equal(verifyRouteNoteAuthority("", env), false);
  assert.throws(() => createRouteNoteAuthorityCookie(env, 43_200), (error: unknown) => {
    assert.equal(
      (error as { code?: string }).code,
      "ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED"
    );
    return true;
  });
});
