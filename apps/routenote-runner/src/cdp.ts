import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  RouteNoteBrowserError,
  type RouteNoteBrowserPort,
  type RouteNoteLocator,
  type RouteNoteLocatorCandidate
} from "../../../packages/integrations/src/routenote/index.ts";

export interface CdpTransport {
  send(method: string, params?: Record<string, unknown>): Promise<any>;
}

export interface CdpPortRuntime {
  now(): number;
  sleep(ms: number): Promise<void>;
}

interface LocatorSnapshot {
  count: number;
  visibleCount: number;
  text: string | null;
  texts: string[];
}

const defaultRuntime: CdpPortRuntime = {
  now: () => Date.now(),
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms))
};

function locatorProgram(candidate: RouteNoteLocatorCandidate): string {
  const encoded = JSON.stringify(candidate);
  return `
    const candidate = ${encoded};
    const normalize = value => String(value ?? "").replace(/\\s+/g, " ").trim();
    const visible = element => {
      if (!element || !element.isConnected) return false;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const nativeRole = element => {
      const tag = String(element.tagName || "").toLowerCase();
      if (tag === "button") return "button";
      if (tag === "a" && element.hasAttribute("href")) return "link";
      if (tag === "input" && ["button", "submit", "reset"].includes(String(element.type || "").toLowerCase())) return "button";
      if (tag === "input" && ["checkbox", "radio"].includes(String(element.type || "").toLowerCase())) return String(element.type).toLowerCase();
      return "";
    };
    const accessibleName = element => normalize(
      element.getAttribute?.("aria-label") ||
      element.getAttribute?.("title") ||
      element.value ||
      element.textContent
    );
    let elements = [];
    if (candidate.kind === "css") {
      elements = Array.from(document.querySelectorAll(candidate.value));
    } else if (candidate.kind === "name") {
      elements = Array.from(document.querySelectorAll("[name]"))
        .filter(element => element.getAttribute("name") === candidate.value);
    } else if (candidate.kind === "id") {
      const element = document.getElementById(candidate.value);
      elements = element ? [element] : [];
    } else if (candidate.kind === "label") {
      elements = Array.from(document.querySelectorAll("label"))
        .filter(label => normalize(label.textContent) === normalize(candidate.value))
        .map(label => label.control || (label.htmlFor ? document.getElementById(label.htmlFor) : null) || label.querySelector("input,select,textarea,button"))
        .filter(Boolean);
    } else if (candidate.kind === "text") {
      elements = Array.from(document.querySelectorAll("a,button,label,input,select,textarea,[role],div,span,p,h1,h2,h3,h4,h5,h6"))
        .filter(element => normalize(element.textContent || element.value) === normalize(candidate.value));
    } else if (candidate.kind === "role") {
      elements = Array.from(document.querySelectorAll("a,button,input,select,textarea,[role]"))
        .filter(element => {
          const role = element.getAttribute("role") || nativeRole(element);
          return role === candidate.role && accessibleName(element) === normalize(candidate.value);
        });
    }
  `;
}

function inspectExpression(candidate: RouteNoteLocatorCandidate): string {
  return `(() => {
    ${locatorProgram(candidate)}
    const texts = elements.map(element => normalize(element.textContent || element.value));
    return {
      count: elements.length,
      visibleCount: elements.filter(visible).length,
      text: texts[0] ?? null,
      texts
    };
  })()`;
}

function actionExpression(
  candidate: RouteNoteLocatorCandidate,
  action:
    | { type: "click" }
    | { type: "fill"; value: string }
    | { type: "select"; value: string }
    | { type: "check"; checked: boolean }
): string {
  const encodedAction = JSON.stringify(action);
  return `(() => {
    ${locatorProgram(candidate)}
    if (elements.length !== 1) return false;
    const element = elements[0];
    const action = ${encodedAction};
    if (action.type === "click") {
      element.click();
      return true;
    }
    if (action.type === "fill") {
      if (!("value" in element)) return false;
      element.focus?.();
      element.value = action.value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (action.type === "select") {
      if (!("value" in element)) return false;
      element.value = action.value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (action.type === "check") {
      if (!("checked" in element)) return false;
      element.checked = action.checked;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  })()`;
}

function elementExpression(candidate: RouteNoteLocatorCandidate): string {
  return `(() => {
    ${locatorProgram(candidate)}
    return elements.length === 1 ? elements[0] : null;
  })()`;
}

function normalizeSnapshot(value: unknown): LocatorSnapshot {
  if (!value || typeof value !== "object") {
    return { count: 0, visibleCount: 0, text: null, texts: [] };
  }
  const record = value as Record<string, unknown>;
  return {
    count: typeof record.count === "number" ? record.count : 0,
    visibleCount:
      typeof record.visibleCount === "number" ? record.visibleCount : 0,
    text: typeof record.text === "string" ? record.text : null,
    texts: Array.isArray(record.texts)
      ? record.texts.filter((item): item is string => typeof item === "string")
      : []
  };
}

async function evaluateValue(
  transport: CdpTransport,
  expression: string
): Promise<unknown> {
  const response = await transport.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return response?.result?.value;
}

async function inspectCandidate(
  transport: CdpTransport,
  candidate: RouteNoteLocatorCandidate
): Promise<LocatorSnapshot> {
  return normalizeSnapshot(
    await evaluateValue(transport, inspectExpression(candidate))
  );
}

async function resolveUniqueCandidate(
  transport: CdpTransport,
  target: RouteNoteLocator,
  requireVisible: boolean
): Promise<RouteNoteLocatorCandidate> {
  for (const candidate of target.candidates) {
    const snapshot = await inspectCandidate(transport, candidate);
    if (snapshot.count !== 1) continue;
    if (requireVisible && snapshot.visibleCount !== 1) continue;
    return candidate;
  }

  throw new RouteNoteBrowserError(
    "ROUTENOTE_UI_CONTRACT_CHANGED",
    `No unique RouteNote UI locator found for ${target.operation}`
  );
}

async function runAction(
  transport: CdpTransport,
  target: RouteNoteLocator,
  action:
    | { type: "click" }
    | { type: "fill"; value: string }
    | { type: "select"; value: string }
    | { type: "check"; checked: boolean }
): Promise<void> {
  const candidate = await resolveUniqueCandidate(transport, target, true);
  const performed = await evaluateValue(
    transport,
    actionExpression(candidate, action)
  );
  if (performed !== true) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_UI_CONTRACT_CHANGED",
      `RouteNote UI action failed for ${target.operation}`
    );
  }
}

export function createRouteNoteCdpPort(
  transport: CdpTransport,
  runtime: CdpPortRuntime = defaultRuntime
): RouteNoteBrowserPort {
  return {
    async goto(url) {
      await transport.send("Page.navigate", { url });
    },

    async currentUrl() {
      const value = await evaluateValue(transport, "location.href");
      return typeof value === "string" ? value : "";
    },

    async isVisible(target) {
      for (const candidate of target.candidates) {
        const snapshot = await inspectCandidate(transport, candidate);
        if (snapshot.visibleCount > 0) return true;
      }
      return false;
    },

    async click(target) {
      await runAction(transport, target, { type: "click" });
    },

    async fill(target, value) {
      await runAction(transport, target, { type: "fill", value });
    },

    async select(target, value) {
      await runAction(transport, target, { type: "select", value });
    },

    async check(target, checked) {
      await runAction(transport, target, { type: "check", checked });
    },

    async setInputFiles(target, paths) {
      const candidate = await resolveUniqueCandidate(transport, target, false);
      const evaluated = await transport.send("Runtime.evaluate", {
        expression: elementExpression(candidate),
        returnByValue: false,
        awaitPromise: true
      });
      const objectId = evaluated?.result?.objectId;
      if (typeof objectId !== "string") {
        throw new RouteNoteBrowserError(
          "ROUTENOTE_UI_CONTRACT_CHANGED",
          `RouteNote file input could not be resolved for ${target.operation}`
        );
      }
      const described = await transport.send("DOM.describeNode", { objectId });
      const backendNodeId = described?.node?.backendNodeId;
      if (typeof backendNodeId !== "number") {
        throw new RouteNoteBrowserError(
          "ROUTENOTE_UI_CONTRACT_CHANGED",
          `RouteNote file input node is unavailable for ${target.operation}`
        );
      }
      await transport.send("DOM.setFileInputFiles", {
        files: paths,
        backendNodeId
      });
    },

    async text(target) {
      for (const candidate of target.candidates) {
        const snapshot = await inspectCandidate(transport, candidate);
        if (snapshot.count === 1) return snapshot.text;
      }
      return null;
    },

    async allText(target) {
      for (const candidate of target.candidates) {
        const snapshot = await inspectCandidate(transport, candidate);
        if (snapshot.count > 0) return snapshot.texts;
      }
      return [];
    },

    async waitForVisible(target, timeoutMs = 10_000) {
      const deadline = runtime.now() + timeoutMs;
      while (runtime.now() <= deadline) {
        if (await this.isVisible(target)) return;
        await runtime.sleep(100);
      }
      throw new RouteNoteBrowserError(
        "ROUTENOTE_UI_CONTRACT_CHANGED",
        `Timed out waiting for RouteNote UI locator ${target.operation}`
      );
    },

    async screenshot(path) {
      const result = await transport.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true
      });
      if (typeof result?.data !== "string") {
        throw new RouteNoteBrowserError(
          "ROUTENOTE_UI_CONTRACT_CHANGED",
          "Chrome did not return screenshot data"
        );
      }
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, Buffer.from(result.data, "base64"));
    }
  };
}
