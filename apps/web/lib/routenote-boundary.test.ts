import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

async function source(path: string) {
  return readFile(resolve(process.cwd(), path), "utf8");
}

test("RouteNote web control surface exposes no executable final-submission path", async () => {
  const sources = await Promise.all([
    source("lib/routenote-control.server.ts"),
    source("lib/routenote-run.server.ts"),
    source("lib/routenote-media-import.server.ts"),
    source("app/api/distribution/routenote/route.ts"),
    source("app/api/distribution/routenote/login/route.ts"),
    source("app/api/distribution/routenote/check/route.ts"),
    source("app/api/distribution/routenote/preflight/route.ts"),
    source("app/api/distribution/routenote/draft-authorization/route.ts"),
    source("app/api/distribution/routenote/drafts/route.ts"),
    source("app/api/distribution/routenote/authorize/route.ts"),
    source("app/api/distribution/routenote/media/route.ts"),
    source("components/RouteNoteControlSurface.tsx"),
    source("components/RouteNoteControlPanel.tsx"),
    source("components/RouteNoteMediaImport.tsx")
  ]);
  const combined = sources.join("\n");

  assert.equal(/\.recordExternalSubmission\s*\(/.test(combined), false);
  assert.equal(/\/api\/distribution\/routenote\/(?:submit|publish|distribute)\b/i.test(combined), false);
  assert.equal(/actionType\s*:\s*["'](?:SUBMIT|PUBLISH|DISTRIBUTE)["']/i.test(combined), false);
});

test("client and operational API routes do not expose local provider/session fields", async () => {
  const publicFacing = (
    await Promise.all([
      source("components/RouteNoteControlSurface.tsx"),
      source("components/RouteNoteControlPanel.tsx"),
      source("components/RouteNoteMediaImport.tsx"),
      source("app/api/distribution/routenote/route.ts"),
      source("app/api/distribution/routenote/login/route.ts"),
      source("app/api/distribution/routenote/check/route.ts"),
      source("app/api/distribution/routenote/preflight/route.ts"),
      source("app/api/distribution/routenote/draft-authorization/route.ts"),
      source("app/api/distribution/routenote/drafts/route.ts"),
      source("app/api/distribution/routenote/runs/route.ts"),
      source("app/api/distribution/routenote/media/route.ts")
    ])
  ).join("\n");

  assert.equal(/ROUTENOTE_CONTROL_PASSPHRASE/.test(publicFacing), false);
  assert.equal(/profileDir/.test(publicFacing), false);
  assert.equal(/receiptPath/.test(publicFacing), false);
  assert.equal(/ROUTENOTE_BROWSER_EXECUTABLE_PATH/.test(publicFacing), false);
  assert.equal(/fileUrl/.test(publicFacing), false);
  assert.equal(/storageKey/.test(publicFacing), false);
});

test("owner unlock is separate from RouteNote account credentials", async () => {
  const surface = await source("components/RouteNoteControlSurface.tsx");
  const authorizeRoute = await source(
    "app/api/distribution/routenote/authorize/route.ts"
  );

  assert.match(surface, /separate from your RouteNote account password/i);
  assert.match(surface, /type="password"/);
  assert.doesNotMatch(surface, /ROUTENOTE_CONTROL_PASSPHRASE/);
  assert.match(authorizeRoute, /verifyRouteNotePassphrase/);
});

test("SongForge navigation exposes the no-terminal RouteNote control surface", async () => {
  const shell = await source("components/AppShell.tsx");
  const page = await source("app/distribution/routenote/page.tsx");
  const surface = await source("components/RouteNoteControlSurface.tsx");

  assert.match(shell, /href:\s*"\/distribution\/routenote"/);
  assert.match(shell, /label:\s*"Distribute"/);
  assert.match(page, /RouteNoteControlSurface/);
  assert.match(surface, /RouteNoteMediaImport/);
});

test("operator surface names the durable DRAFT_READY stopping boundary and review action only", async () => {
  const panel = await source("components/RouteNoteControlPanel.tsx");

  assert.match(panel, /Run production preflight/);
  assert.match(panel, /Authorize this package/);
  assert.match(panel, /Run RouteNote draft automation/);
  assert.match(panel, /ROUTENOTE DRAFT READY/);
  assert.match(panel, /Review in RouteNote/);
  assert.match(panel, /Final submission/);
  assert.match(panel, /NOT PERFORMED/);
  assert.doesNotMatch(panel, /Submit RouteNote/i);
  assert.doesNotMatch(panel, /Publish Release/i);
});
