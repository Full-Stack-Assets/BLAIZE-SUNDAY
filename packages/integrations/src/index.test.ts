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

test("ElevenLabs advertises voice design without claiming connection", () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  const eleven = inspectIntegrations().find((item) => item.id === "elevenlabs");
  assert.ok(eleven?.capabilities.includes("voice_design"));
  assert.equal(eleven?.status, "UNCONFIGURED");
  if (previous) process.env.ELEVENLABS_API_KEY = previous;
});

test("RouteNote advertises draft automation without claiming a browser connection", () => {
  const previous = process.env.ROUTENOTE_BROWSER_HOST_ENABLED;
  delete process.env.ROUTENOTE_BROWSER_HOST_ENABLED;

  const routeNote = inspectIntegrations().find((item) => item.id === "routenote");

  assert.equal(routeNote?.provider, "routenote");
  assert.equal(routeNote?.status, "UNCONFIGURED");
  assert.deepEqual(routeNote?.capabilities, [
    "prepare_release",
    "create_release",
    "upload_audio",
    "upload_artwork",
    "configure_metadata",
    "configure_stores",
    "prepare_draft"
  ]);

  if (previous === undefined) {
    delete process.env.ROUTENOTE_BROWSER_HOST_ENABLED;
  } else {
    process.env.ROUTENOTE_BROWSER_HOST_ENABLED = previous;
  }
});

test("RouteNote host configuration remains UNAUTHORIZED until the host verifies a live session", () => {
  const previous = process.env.ROUTENOTE_BROWSER_HOST_ENABLED;
  process.env.ROUTENOTE_BROWSER_HOST_ENABLED = "1";

  const routeNote = inspectIntegrations().find((item) => item.id === "routenote");

  assert.equal(routeNote?.status, "UNAUTHORIZED");
  assert.notEqual(routeNote?.status, "CONNECTED");

  if (previous === undefined) {
    delete process.env.ROUTENOTE_BROWSER_HOST_ENABLED;
  } else {
    process.env.ROUTENOTE_BROWSER_HOST_ENABLED = previous;
  }
});
