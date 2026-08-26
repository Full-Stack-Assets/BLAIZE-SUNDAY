import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  RouteNoteBrowserError,
  type RouteNoteLocator
} from "../../../packages/integrations/src/index.ts";
import {
  createRouteNoteCdpPort,
  type CdpTransport
} from "./cdp.ts";

class FakeCdpTransport implements CdpTransport {
  readonly calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  readonly evaluateValues: unknown[] = [];
  readonly evaluateObjects: Array<{ objectId?: string }> = [];
  screenshotData = Buffer.from("png-bytes").toString("base64");

  async send(method: string, params?: Record<string, unknown>): Promise<any> {
    this.calls.push({ method, params });

    if (method === "Runtime.evaluate") {
      if (params?.returnByValue === false) {
        return { result: this.evaluateObjects.shift() ?? {} };
      }
      return { result: { value: this.evaluateValues.shift() } };
    }
    if (method === "DOM.describeNode") {
      return { node: { backendNodeId: 42 } };
    }
    if (method === "Page.captureScreenshot") {
      return { data: this.screenshotData };
    }
    return {};
  }
}

const fallbackLocator: RouteNoteLocator = {
  operation: "release-title",
  candidates: [
    { kind: "label", value: "Release Title" },
    { kind: "name", value: "release_title" }
  ]
};

const unique = (text = "") => ({
  count: 1,
  visibleCount: 1,
  text,
  texts: text ? [text] : []
});

const missing = { count: 0, visibleCount: 0, text: null, texts: [] as string[] };

test("CDP port skips ambiguous action candidates and uses a later unique fallback", async () => {
  const transport = new FakeCdpTransport();
  transport.evaluateValues.push(
    { count: 2, visibleCount: 2, text: null, texts: [] },
    unique(),
    true
  );
  const port = createRouteNoteCdpPort(transport);

  await port.fill(fallbackLocator, "Chrome Receipt");

  const evaluations = transport.calls.filter(call => call.method === "Runtime.evaluate");
  assert.equal(evaluations.length, 3);
  assert.match(String(evaluations[0]?.params?.expression), /Release Title/);
  assert.match(String(evaluations[1]?.params?.expression), /release_title/);
  assert.match(String(evaluations[2]?.params?.expression), /Chrome Receipt/);
});

test("CDP port fails closed when no unique action locator resolves", async () => {
  const transport = new FakeCdpTransport();
  transport.evaluateValues.push(
    { count: 2, visibleCount: 2, text: null, texts: [] },
    missing
  );
  const port = createRouteNoteCdpPort(transport);

  await assert.rejects(port.click(fallbackLocator), (error: unknown) => {
    assert.ok(error instanceof RouteNoteBrowserError);
    assert.equal(error.code, "ROUTENOTE_UI_CONTRACT_CHANGED");
    return true;
  });
});

test("CDP port maps select and checkbox operations through canonical DOM events", async () => {
  const transport = new FakeCdpTransport();
  transport.evaluateValues.push(unique(), true, unique(), true);
  const port = createRouteNoteCdpPort(transport);

  await port.select(
    { operation: "genre", candidates: [{ kind: "name", value: "genre" }] },
    "Pop"
  );
  await port.check(
    { operation: "store", candidates: [{ kind: "id", value: "spotify" }] },
    true
  );

  const expressions = transport.calls
    .filter(call => call.method === "Runtime.evaluate")
    .map(call => String(call.params?.expression));
  assert.equal(expressions.some(expression => expression.includes("Pop")), true);
  assert.equal(expressions.some(expression => expression.includes("spotify")), true);
});

test("CDP port assigns exact local files using DOM.setFileInputFiles", async () => {
  const transport = new FakeCdpTransport();
  transport.evaluateValues.push(unique());
  transport.evaluateObjects.push({ objectId: "file-input-object" });
  const port = createRouteNoteCdpPort(transport);
  const locator: RouteNoteLocator = {
    operation: "audio-file-input",
    candidates: [{ kind: "css", value: "input[type='file']" }]
  };

  await port.setInputFiles(locator, ["/tmp/track-1.flac", "/tmp/track-2.flac"]);

  const describe = transport.calls.find(call => call.method === "DOM.describeNode");
  assert.equal(describe?.params?.objectId, "file-input-object");
  const setFiles = transport.calls.find(call => call.method === "DOM.setFileInputFiles");
  assert.deepEqual(setFiles?.params, {
    files: ["/tmp/track-1.flac", "/tmp/track-2.flac"],
    backendNodeId: 42
  });
});

test("CDP port exposes text lists and current browser URL", async () => {
  const transport = new FakeCdpTransport();
  transport.evaluateValues.push(
    { count: 2, visibleCount: 2, text: "Draft One", texts: ["Draft One", "Draft Two"] },
    "https://www.routenote.com/distribution"
  );
  const port = createRouteNoteCdpPort(transport);

  assert.deepEqual(
    await port.allText({
      operation: "draft-list",
      candidates: [{ kind: "css", value: ".draft-row" }]
    }),
    ["Draft One", "Draft Two"]
  );
  assert.equal(await port.currentUrl(), "https://www.routenote.com/distribution");
});

test("CDP port maps navigation and screenshots", async () => {
  const transport = new FakeCdpTransport();
  const directory = await mkdtemp(join(tmpdir(), "routenote-cdp-"));
  const screenshotPath = join(directory, "failure.png");
  const port = createRouteNoteCdpPort(transport);

  try {
    await port.goto("https://www.routenote.com/distribution");
    await port.screenshot(screenshotPath);

    assert.deepEqual(
      transport.calls.find(call => call.method === "Page.navigate")?.params,
      { url: "https://www.routenote.com/distribution" }
    );
    assert.deepEqual(await readFile(screenshotPath), Buffer.from("png-bytes"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
