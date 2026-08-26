import assert from "node:assert/strict";
import test from "node:test";

import type { RouteNoteBrowserPort } from "../../../packages/integrations/src/index.ts";
import {
  buildChromeArgs,
  parseDevToolsActivePort,
  resolveChromeExecutable,
  waitForRouteNoteAuthentication
} from "./browser.ts";
import { RouteNoteRunnerError } from "./errors.ts";

const fakePort = (visibleSequence: boolean[]): RouteNoteBrowserPort => {
  let index = 0;
  return {
    async goto() {},
    async currentUrl() {
      return "https://www.routenote.com/";
    },
    async isVisible() {
      const value = visibleSequence[Math.min(index, visibleSequence.length - 1)] ?? false;
      index += 1;
      return value;
    },
    async click() {},
    async fill() {},
    async select() {},
    async check() {},
    async setInputFiles() {},
    async text() {
      return null;
    },
    async allText() {
      return [];
    },
    async waitForVisible() {},
    async screenshot() {}
  };
};

test("Chrome args use a private persistent profile and loopback ephemeral DevTools port", () => {
  const args = buildChromeArgs({
    profileDir: "/workspace/.songforge/routenote/browser-profile",
    headless: false,
    initialUrl: "https://www.routenote.com/"
  });

  assert.ok(args.includes("--remote-debugging-address=127.0.0.1"));
  assert.ok(args.includes("--remote-debugging-port=0"));
  assert.ok(args.includes("--user-data-dir=/workspace/.songforge/routenote/browser-profile"));
  assert.equal(args.some(arg => arg.startsWith("--headless")), false);
  assert.equal(args.at(-1), "https://www.routenote.com/");
});

test("Chrome args support explicit headless upload execution", () => {
  const args = buildChromeArgs({
    profileDir: "/private/profile",
    headless: true,
    initialUrl: "https://www.routenote.com/"
  });

  assert.ok(args.includes("--headless=new"));
});

test("DevToolsActivePort parsing returns the loopback browser websocket endpoint", () => {
  assert.equal(
    parseDevToolsActivePort("43123\n/devtools/browser/abc-123\n"),
    "ws://127.0.0.1:43123/devtools/browser/abc-123"
  );
});

test("invalid DevToolsActivePort content fails closed", () => {
  assert.throws(
    () => parseDevToolsActivePort("not-a-port\n/devtools/browser/abc\n"),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_CDP_CONNECTION_FAILED");
      return true;
    }
  );
});

test("browser executable override is used only when it exists", async () => {
  const executable = await resolveChromeExecutable({
    platform: "linux",
    env: {
      ROUTENOTE_BROWSER_EXECUTABLE_PATH: "/custom/chrome",
      PATH: "/usr/bin"
    },
    canExecute: async path => path === "/custom/chrome"
  });

  assert.equal(executable, "/custom/chrome");
});

test("browser discovery fails with a stable error when no Chrome-compatible binary exists", async () => {
  await assert.rejects(
    resolveChromeExecutable({
      platform: "linux",
      env: { PATH: "/empty" },
      canExecute: async () => false
    }),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_BROWSER_NOT_FOUND");
      return true;
    }
  );
});

test("login waits until RouteNote Distribution becomes visible", async () => {
  let now = 0;
  let sleeps = 0;
  await waitForRouteNoteAuthentication(fakePort([false, false, true]), {
    timeoutMs: 5_000,
    now: () => now,
    sleep: async ms => {
      sleeps += 1;
      now += ms;
    }
  });

  assert.equal(sleeps, 2);
});

test("login timeout is reported without bypassing RouteNote authentication", async () => {
  let now = 0;
  await assert.rejects(
    waitForRouteNoteAuthentication(fakePort([false]), {
      timeoutMs: 500,
      now: () => now,
      sleep: async ms => {
        now += ms;
      }
    }),
    (error: unknown) => {
      assert.ok(error instanceof RouteNoteRunnerError);
      assert.equal(error.code, "ROUTENOTE_LOGIN_TIMEOUT");
      return true;
    }
  );
});
