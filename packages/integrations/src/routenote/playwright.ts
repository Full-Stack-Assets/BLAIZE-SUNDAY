import type {
  RouteNoteBrowserPort,
  RouteNoteLocator,
  RouteNoteLocatorCandidate
} from "./browser-port.ts";
import { RouteNoteBrowserError } from "./types.ts";

export interface PlaywrightLocatorLike {
  count(): Promise<number>;
  isVisible(): Promise<boolean>;
  click(): Promise<unknown>;
  fill(value: string): Promise<unknown>;
  selectOption(value: string): Promise<unknown>;
  check(): Promise<unknown>;
  uncheck(): Promise<unknown>;
  setInputFiles(paths: string[]): Promise<unknown>;
  textContent(): Promise<string | null>;
  allTextContents(): Promise<string[]>;
  waitFor(options: { state: "visible"; timeout?: number }): Promise<unknown>;
}

export interface PlaywrightPageLike {
  getByRole(role: string, options: { name: string }): PlaywrightLocatorLike;
  getByLabel(value: string): PlaywrightLocatorLike;
  getByText(value: string): PlaywrightLocatorLike;
  locator(value: string): PlaywrightLocatorLike;
  goto(url: string): Promise<unknown>;
  url(): string;
  screenshot(options: { path: string }): Promise<unknown>;
}

function toPageLocator(
  page: PlaywrightPageLike,
  candidate: RouteNoteLocatorCandidate
): PlaywrightLocatorLike | null {
  switch (candidate.kind) {
    case "role":
      return candidate.role
        ? page.getByRole(candidate.role, { name: candidate.value })
        : null;
    case "label":
      return page.getByLabel(candidate.value);
    case "text":
      return page.getByText(candidate.value);
    case "name":
      return page.locator(`[name=${JSON.stringify(candidate.value)}]`);
    case "id":
      return page.locator(`[id=${JSON.stringify(candidate.value)}]`);
    case "css":
      return page.locator(candidate.value);
  }
}

async function resolveRequired(
  page: PlaywrightPageLike,
  target: RouteNoteLocator,
  requireVisible: boolean
): Promise<PlaywrightLocatorLike> {
  for (const candidate of target.candidates) {
    const locator = toPageLocator(page, candidate);
    if (!locator) continue;

    // Action locators must resolve to exactly one provider element. Accepting a
    // multi-match would let Playwright strict-mode fail later or, worse, target
    // the wrong repeated track/store field.
    const count = await locator.count();
    if (count !== 1) continue;
    if (requireVisible && !(await locator.isVisible())) continue;
    return locator;
  }

  throw new RouteNoteBrowserError(
    "ROUTENOTE_UI_CONTRACT_CHANGED",
    `No unique usable RouteNote UI locator found for ${target.operation}`
  );
}

async function resolveOptionalSingle(
  page: PlaywrightPageLike,
  target: RouteNoteLocator
): Promise<PlaywrightLocatorLike | null> {
  for (const candidate of target.candidates) {
    const locator = toPageLocator(page, candidate);
    if (locator && (await locator.count()) === 1) return locator;
  }
  return null;
}

async function resolveOptionalMany(
  page: PlaywrightPageLike,
  target: RouteNoteLocator
): Promise<PlaywrightLocatorLike | null> {
  for (const candidate of target.candidates) {
    const locator = toPageLocator(page, candidate);
    if (locator && (await locator.count()) > 0) return locator;
  }
  return null;
}

export function createRouteNotePlaywrightPort(
  page: PlaywrightPageLike
): RouteNoteBrowserPort {
  return {
    async goto(url) {
      await page.goto(url);
    },

    async currentUrl() {
      return page.url();
    },

    async isVisible(target) {
      for (const candidate of target.candidates) {
        const locator = toPageLocator(page, candidate);
        if (!locator || (await locator.count()) !== 1) continue;
        if (await locator.isVisible()) return true;
      }
      return false;
    },

    async click(target) {
      const locator = await resolveRequired(page, target, true);
      await locator.click();
    },

    async fill(target, value) {
      const locator = await resolveRequired(page, target, true);
      await locator.fill(value);
    },

    async select(target, value) {
      const locator = await resolveRequired(page, target, true);
      await locator.selectOption(value);
    },

    async check(target, checked) {
      const locator = await resolveRequired(page, target, true);
      if (checked) {
        await locator.check();
      } else {
        await locator.uncheck();
      }
    },

    async setInputFiles(target, paths) {
      // File inputs may be intentionally hidden while still being valid upload
      // targets, so existence/uniqueness rather than visibility is the contract.
      const locator = await resolveRequired(page, target, false);
      await locator.setInputFiles(paths);
    },

    async text(target) {
      const locator = await resolveOptionalSingle(page, target);
      return locator ? locator.textContent() : null;
    },

    async allText(target) {
      const locator = await resolveOptionalMany(page, target);
      return locator ? locator.allTextContents() : [];
    },

    async waitForVisible(target, timeoutMs) {
      const locator = await resolveRequired(page, target, false);
      await locator.waitFor({ state: "visible", timeout: timeoutMs });
    },

    async screenshot(path) {
      await page.screenshot({ path });
    }
  };
}
