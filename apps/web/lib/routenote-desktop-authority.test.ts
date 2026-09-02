import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUTENOTE_DESKTOP_COOKIE,
  createRouteNoteDesktopCookie,
  verifyRouteNoteDesktopAuthority
} from "./routenote-desktop-authority.server.ts";

const env = {
  NODE_ENV: "production",
  ROUTENOTE_CONTROL_PASSPHRASE: "correct horse battery staple"
} as NodeJS.ProcessEnv;

function cookieHeader(setCookie: string): string {
  return setCookie.split(";")[0] ?? "";
}

test("interactive desktop cookie is HttpOnly Strict Secure and mode-bound", () => {
  const setCookie = createRouteNoteDesktopCookie(
    "INTERACTIVE",
    env,
    600,
    1_000,
    "a".repeat(32)
  );
  assert.match(setCookie, new RegExp(`^${ROUTENOTE_DESKTOP_COOKIE}=`));
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Secure/);
  const header = cookieHeader(setCookie);
  assert.equal(verifyRouteNoteDesktopAuthority(header, "INTERACTIVE", env, 1_100), true);
  assert.equal(verifyRouteNoteDesktopAuthority(header, "VIEW_ONLY", env, 1_100), false);
});

test("desktop cookie expires cryptographically and cannot exceed the 15 minute ceiling", () => {
  const setCookie = createRouteNoteDesktopCookie(
    "VIEW_ONLY",
    env,
    86_400,
    2_000,
    "b".repeat(32)
  );
  const header = cookieHeader(setCookie);
  assert.equal(verifyRouteNoteDesktopAuthority(header, "VIEW_ONLY", env, 2_899), true);
  assert.equal(verifyRouteNoteDesktopAuthority(header, "VIEW_ONLY", env, 2_900), false);
});

test("desktop session is invalidated by owner-secret rotation", () => {
  const header = cookieHeader(
    createRouteNoteDesktopCookie("INTERACTIVE", env, 600, 3_000, "c".repeat(32))
  );
  assert.equal(
    verifyRouteNoteDesktopAuthority(
      header,
      "INTERACTIVE",
      { ...env, ROUTENOTE_CONTROL_PASSPHRASE: "rotated secret" },
      3_100
    ),
    false
  );
});
