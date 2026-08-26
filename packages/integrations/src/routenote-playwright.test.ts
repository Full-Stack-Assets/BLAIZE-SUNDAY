import assert from "node:assert/strict";
import test from "node:test";

import {
  createRouteNotePlaywrightPort,
  RouteNoteBrowserError,
  type RouteNoteLocator
} from "./routenote/index.ts";

class FakeLocator {
  readonly events: string[];
  readonly key: string;
  countValue = 1;
  visible = true;
  textValue: string | null = null;
  textsValue: string[] = [];

  constructor(events: string[], key: string) {
    this.events = events;
    this.key = key;
  }

  async count() {
    this.events.push(`count:${this.key}`);
    return this.countValue;
  }

  async isVisible() {
    this.events.push(`visible:${this.key}`);
    return this.visible;
  }

  async click() {
    this.events.push(`click:${this.key}`);
  }

  async fill(value: string) {
    this.events.push(`fill:${this.key}=${value}`);
  }

  async selectOption(value: string) {
    this.events.push(`select:${this.key}=${value}`);
  }

  async check() {
    this.events.push(`check:${this.key}`);
  }

  async uncheck() {
    this.events.push(`uncheck:${this.key}`);
  }

  async setInputFiles(paths: string[]) {
    this.events.push(`files:${this.key}=${paths.join("|")}`);
  }

  async textContent() {
    this.events.push(`text:${this.key}`);
    return this.textValue;
  }

  async allTextContents() {
    this.events.push(`allText:${this.key}`);
    return this.textsValue;
  }

  async waitFor(options: { state: "visible"; timeout?: number }) {
    this.events.push(`wait:${this.key}:${options.state}:${options.timeout ?? "default"}`);
  }
}

class FakePage {
  readonly events: string[] = [];
  readonly locators = new Map<string, FakeLocator>();
  pageUrl = "https://www.routenote.com/distribution";

  private get(key: string) {
    let locator = this.locators.get(key);
    if (!locator) {
      locator = new FakeLocator(this.events, key);
      this.locators.set(key, locator);
    }
    return locator;
  }

  getByRole(role: string, options: { name: string }) {
    this.events.push(`resolve:role:${role}:${options.name}`);
    return this.get(`role:${role}:${options.name}`);
  }

  getByLabel(value: string) {
    this.events.push(`resolve:label:${value}`);
    return this.get(`label:${value}`);
  }

  getByText(value: string) {
    this.events.push(`resolve:text:${value}`);
    return this.get(`text:${value}`);
  }

  locator(value: string) {
    this.events.push(`resolve:css:${value}`);
    return this.get(`css:${value}`);
  }

  async goto(url: string) {
    this.events.push(`goto:${url}`);
    this.pageUrl = url;
  }

  url() {
    return this.pageUrl;
  }

  async screenshot(options: { path: string }) {
    this.events.push(`screenshot:${options.path}`);
  }
}

const fallbackLocator: RouteNoteLocator = {
  operation: "release-title",
  candidates: [
    { kind: "label", value: "Release Title" },
    { kind: "name", value: "release_title" }
  ]
};

test("Playwright adapter tries locator candidates in order until a usable fallback exists", async () => {
  const page = new FakePage();
  page.getByLabel("Release Title").countValue = 0;
  const port = createRouteNotePlaywrightPort(page);

  await port.fill(fallbackLocator, "Chrome Receipt");

  const firstCount = page.events.indexOf("count:label:Release Title");
  const secondResolve = page.events.indexOf('resolve:css:[name="release_title"]');
  assert.ok(firstCount >= 0);
  assert.ok(secondResolve > firstCount);
  assert.ok(page.events.includes('fill:css:[name="release_title"]=Chrome Receipt'));
});

test("Playwright adapter skips ambiguous action candidates and uses a unique fallback", async () => {
  const page = new FakePage();
  page.getByLabel("Release Title").countValue = 2;
  const port = createRouteNotePlaywrightPort(page);

  await port.fill(fallbackLocator, "Chrome Receipt");

  assert.equal(page.events.includes("fill:label:Release Title=Chrome Receipt"), false);
  assert.ok(page.events.includes('fill:css:[name="release_title"]=Chrome Receipt'));
});

test("Playwright adapter fails with a stable UI-contract error when no candidate resolves", async () => {
  const page = new FakePage();
  page.getByLabel("Release Title").countValue = 0;
  page.locator('[name="release_title"]').countValue = 0;
  const port = createRouteNotePlaywrightPort(page);

  await assert.rejects(port.click(fallbackLocator), (error: unknown) => {
    assert.ok(error instanceof RouteNoteBrowserError);
    assert.equal(error.code, "ROUTENOTE_UI_CONTRACT_CHANGED");
    return true;
  });
});

test("Playwright adapter passes exact audio file paths to the resolved input", async () => {
  const page = new FakePage();
  const port = createRouteNotePlaywrightPort(page);
  const input: RouteNoteLocator = {
    operation: "audio-file-input",
    candidates: [{ kind: "css", value: "input[type='file']" }]
  };

  await port.setInputFiles(input, ["/tmp/track-1.flac", "/tmp/track-2.flac"]);

  assert.ok(
    page.events.includes(
      "files:css:input[type='file']=/tmp/track-1.flac|/tmp/track-2.flac"
    )
  );
});

test("Playwright adapter maps screenshots and navigation without managing authentication", async () => {
  const page = new FakePage();
  const port = createRouteNotePlaywrightPort(page);

  await port.goto("https://www.routenote.com/");
  await port.screenshot("/tmp/routenote-failure.png");

  assert.equal(await port.currentUrl(), "https://www.routenote.com/");
  assert.ok(page.events.includes("goto:https://www.routenote.com/"));
  assert.ok(page.events.includes("screenshot:/tmp/routenote-failure.png"));
});
