import { spawn, type ChildProcess } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";

import {
  ROUTENOTE_HOME_URL,
  ROUTENOTE_SELECTORS,
  type RouteNoteBrowserPort
} from "../../../packages/integrations/src/routenote/index.ts";
import { createRouteNoteCdpPort, type CdpTransport } from "./cdp.ts";
import { RouteNoteRunnerError } from "./errors.ts";
import { ensurePrivateDirectory, routeNoteProfileDir } from "./state.ts";

export interface ChromeArgumentInput {
  profileDir: string;
  headless: boolean;
  initialUrl: string;
}

export interface ChromeExecutableRuntime {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  canExecute(path: string): Promise<boolean>;
}

export interface AuthenticationWaitRuntime {
  timeoutMs: number;
  now(): number;
  sleep(ms: number): Promise<void>;
}

interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(
    type: string,
    listener: (event: any) => void,
    options?: { once?: boolean }
  ): void;
}

interface PendingCdpCall {
  resolve(value: any): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

class BrowserCdpConnection {
  private readonly socket: WebSocketLike;
  private readonly pending = new Map<number, PendingCdpCall>();
  private nextId = 1;

  private constructor(socket: WebSocketLike) {
    this.socket = socket;
    socket.addEventListener("message", event => {
      void this.handleMessage(event?.data);
    });
    socket.addEventListener("close", () => {
      const error = new RouteNoteRunnerError(
        "ROUTENOTE_CDP_CONNECTION_FAILED",
        "Chrome DevTools websocket closed"
      );
      for (const call of this.pending.values()) {
        clearTimeout(call.timer);
        call.reject(error);
      }
      this.pending.clear();
    });
  }

  static async connect(url: string): Promise<BrowserCdpConnection> {
    const WebSocketConstructor = (globalThis as unknown as {
      WebSocket?: new (url: string) => WebSocketLike;
    }).WebSocket;
    if (!WebSocketConstructor) {
      throw new RouteNoteRunnerError(
        "ROUTENOTE_CDP_CONNECTION_FAILED",
        "This Node runtime does not expose WebSocket support"
      );
    }

    const socket = new WebSocketConstructor(url);
    await new Promise<void>((resolveOpen, rejectOpen) => {
      socket.addEventListener("open", () => resolveOpen(), { once: true });
      socket.addEventListener(
        "error",
        () =>
          rejectOpen(
            new RouteNoteRunnerError(
              "ROUTENOTE_CDP_CONNECTION_FAILED",
              "Unable to connect to Chrome DevTools websocket"
            )
          ),
        { once: true }
      );
    });
    return new BrowserCdpConnection(socket);
  }

  private async handleMessage(raw: unknown) {
    let text: string;
    if (typeof raw === "string") {
      text = raw;
    } else if (raw instanceof ArrayBuffer) {
      text = Buffer.from(raw).toString("utf8");
    } else if (ArrayBuffer.isView(raw)) {
      text = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString("utf8");
    } else if (
      raw &&
      typeof raw === "object" &&
      "text" in raw &&
      typeof (raw as { text?: unknown }).text === "function"
    ) {
      text = await (raw as { text(): Promise<string> }).text();
    } else {
      return;
    }

    let message: any;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof message?.id !== "number") return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) {
      pending.reject(
        new RouteNoteRunnerError(
          "ROUTENOTE_CDP_CONNECTION_FAILED",
          `Chrome DevTools command failed: ${message.error.message ?? "unknown error"}`
        )
      );
    } else {
      pending.resolve(message.result ?? {});
    }
  }

  async send(
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string
  ): Promise<any> {
    const id = this.nextId++;
    const payload: Record<string, unknown> = { id, method };
    if (params) payload.params = params;
    if (sessionId) payload.sessionId = sessionId;
    const result = new Promise<any>((resolveCall, rejectCall) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectCall(
          new RouteNoteRunnerError(
            "ROUTENOTE_CDP_CONNECTION_FAILED",
            `Chrome DevTools command timed out: ${method}`
          )
        );
      }, 10_000);
      timer.unref?.();
      this.pending.set(id, { resolve: resolveCall, reject: rejectCall, timer });
    });
    try {
      this.socket.send(JSON.stringify(payload));
    } catch {
      const pending = this.pending.get(id);
      if (pending) clearTimeout(pending.timer);
      this.pending.delete(id);
      throw new RouteNoteRunnerError(
        "ROUTENOTE_CDP_CONNECTION_FAILED",
        `Unable to send Chrome DevTools command ${method}`
      );
    }
    return result;
  }

  session(sessionId: string): CdpTransport {
    return {
      send: (method, params) => this.send(method, params, sessionId)
    };
  }

  close() {
    this.socket.close();
  }
}

export interface RouteNoteBrowserSession {
  port: RouteNoteBrowserPort;
  profileDir: string;
  executable: string;
  close(): Promise<void>;
  waitForClose(): Promise<void>;
}

export interface LaunchRouteNoteBrowserInput {
  workspaceRoot: string;
  headless?: boolean;
  initialUrl?: string;
  profileDir?: string;
  executablePath?: string;
  launchTimeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

function defaultCanExecute(path: string) {
  return access(path, fsConstants.X_OK).then(
    () => true,
    () => false
  );
}

function candidatePaths(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv
): string[] {
  const home = env.HOME || env.USERPROFILE || homedir();
  const candidates: string[] = [];

  if (platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    );
  } else if (platform === "win32") {
    for (const root of [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA]) {
      if (root) candidates.push(join(root, "Google", "Chrome", "Application", "chrome.exe"));
    }
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium"
    );
  }

  const pathValue = env.PATH ?? "";
  const pathDelimiter = platform === "win32" ? ";" : delimiter;
  const commands =
    platform === "win32"
      ? ["chrome.exe", "chromium.exe"]
      : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  for (const directory of pathValue.split(pathDelimiter).filter(Boolean)) {
    for (const command of commands) candidates.push(join(directory, command));
  }
  return [...new Set(candidates)];
}

export async function resolveChromeExecutable(
  runtime: ChromeExecutableRuntime
): Promise<string> {
  const override = runtime.env.ROUTENOTE_BROWSER_EXECUTABLE_PATH?.trim();
  if (override) {
    if (await runtime.canExecute(override)) return resolve(override);
    throw new RouteNoteRunnerError(
      "ROUTENOTE_BROWSER_NOT_FOUND",
      "Configured RouteNote browser executable is unavailable."
    );
  }

  for (const candidate of candidatePaths(runtime.platform, runtime.env)) {
    if (await runtime.canExecute(candidate)) return candidate;
  }

  throw new RouteNoteRunnerError(
    "ROUTENOTE_BROWSER_NOT_FOUND",
    "Google Chrome or Chromium was not found."
  );
}

export function buildChromeArgs(input: ChromeArgumentInput): string[] {
  const args = [
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${input.profileDir}`,
    "--no-first-run",
    "--no-default-browser-check"
  ];
  if (input.headless) args.push("--headless=new");
  args.push(input.initialUrl);
  return args;
}

export function parseDevToolsActivePort(content: string): string {
  const [portLine, pathLine] = content.trim().split(/\r?\n/);
  const port = Number(portLine);
  if (
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535 ||
    !pathLine ||
    !pathLine.startsWith("/devtools/browser/")
  ) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_CDP_CONNECTION_FAILED",
      "Chrome DevToolsActivePort file is malformed"
    );
  }
  return `ws://127.0.0.1:${port}${pathLine}`;
}

export async function waitForRouteNoteAuthentication(
  port: RouteNoteBrowserPort,
  runtime: AuthenticationWaitRuntime
): Promise<void> {
  const deadline = runtime.now() + runtime.timeoutMs;
  while (runtime.now() <= deadline) {
    if (await port.isVisible(ROUTENOTE_SELECTORS.distributionNav)) return;
    await runtime.sleep(250);
  }
  throw new RouteNoteRunnerError(
    "ROUTENOTE_LOGIN_TIMEOUT",
    "RouteNote login did not reach the authenticated Distribution surface before timeout"
  );
}

async function waitForDevToolsEndpoint(
  profileDir: string,
  timeoutMs: number,
  processState: { error: Error | null; exited: boolean }
): Promise<string> {
  const activePortPath = join(profileDir, "DevToolsActivePort");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (processState.error) {
      throw new RouteNoteRunnerError(
        "ROUTENOTE_BROWSER_LAUNCH_FAILED",
        "Chrome failed to launch."
      );
    }
    if (processState.exited) {
      throw new RouteNoteRunnerError(
        "ROUTENOTE_BROWSER_LAUNCH_FAILED",
        "Chrome exited before exposing its DevTools endpoint"
      );
    }
    try {
      return parseDevToolsActivePort(await readFile(activePortPath, "utf8"));
    } catch (error) {
      if (
        error instanceof RouteNoteRunnerError &&
        error.code === "ROUTENOTE_CDP_CONNECTION_FAILED"
      ) {
        throw error;
      }
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
  }
  throw new RouteNoteRunnerError(
    "ROUTENOTE_CDP_CONNECTION_FAILED",
    "Timed out waiting for Chrome DevToolsActivePort"
  );
}

function isRouteNoteTarget(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && (host === "routenote.com" || host.endsWith(".routenote.com"));
  } catch {
    return false;
  }
}

async function attachPageSession(
  connection: BrowserCdpConnection,
  initialUrl: string
): Promise<CdpTransport> {
  const targets = await connection.send("Target.getTargets");
  const targetInfos = Array.isArray(targets?.targetInfos) ? targets.targetInfos : [];
  let pageTarget = targetInfos.find(
    (target: any) =>
      target?.type === "page" &&
      typeof target?.url === "string" &&
      isRouteNoteTarget(target.url)
  );
  if (!pageTarget) {
    const created = await connection.send("Target.createTarget", { url: initialUrl });
    pageTarget = { targetId: created?.targetId, type: "page", url: initialUrl };
  }
  if (typeof pageTarget?.targetId !== "string") {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_CDP_CONNECTION_FAILED",
      "Chrome did not expose a usable RouteNote page target"
    );
  }
  const attached = await connection.send("Target.attachToTarget", {
    targetId: pageTarget.targetId,
    flatten: true
  });
  if (typeof attached?.sessionId !== "string") {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_CDP_CONNECTION_FAILED",
      "Chrome did not return a page DevTools session"
    );
  }
  const transport = connection.session(attached.sessionId);
  await Promise.all([
    transport.send("Runtime.enable"),
    transport.send("Page.enable"),
    transport.send("DOM.enable")
  ]);
  return transport;
}

function processExitPromise(processHandle: ChildProcess): Promise<void> {
  if (processHandle.exitCode !== null || processHandle.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise(resolveExit => {
    processHandle.once("exit", () => resolveExit());
  });
}

async function exitedWithin(
  processHandle: ChildProcess,
  timeoutMs: number
): Promise<boolean> {
  if (processHandle.exitCode !== null || processHandle.signalCode !== null) return true;
  return new Promise(resolveExit => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      processHandle.off("exit", onExit);
      resolveExit(value);
    };
    const onExit = () => finish(true);
    processHandle.once("exit", onExit);
    timer = setTimeout(() => finish(false), timeoutMs);
    timer.unref?.();
    if (settled && timer) clearTimeout(timer);
  });
}

async function terminateBrowserProcess(
  processHandle: ChildProcess,
  processState: { exited: boolean }
): Promise<void> {
  if (processState.exited || processHandle.exitCode !== null || processHandle.signalCode !== null) return;

  processHandle.kill("SIGTERM");
  if (await exitedWithin(processHandle, 5_000)) return;

  processHandle.kill("SIGKILL");
  if (await exitedWithin(processHandle, 5_000)) return;

  throw new RouteNoteRunnerError(
    "ROUTENOTE_STATE_POLICY_VIOLATION",
    "Chrome could not be stopped safely; RouteNote profile reuse is blocked."
  );
}

export async function launchRouteNoteBrowser(
  input: LaunchRouteNoteBrowserInput
): Promise<RouteNoteBrowserSession> {
  const env = input.env ?? process.env;
  const platform = input.platform ?? process.platform;
  const profileDir = resolve(
    input.profileDir ?? routeNoteProfileDir(input.workspaceRoot, env)
  );
  await ensurePrivateDirectory(profileDir);
  await rm(join(profileDir, "DevToolsActivePort"), { force: true });

  const executable = input.executablePath
    ? resolve(input.executablePath)
    : await resolveChromeExecutable({ platform, env, canExecute: defaultCanExecute });
  if (input.executablePath && !(await defaultCanExecute(executable))) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_BROWSER_NOT_FOUND",
      "Configured RouteNote browser executable is unavailable."
    );
  }

  const initialUrl = input.initialUrl ?? ROUTENOTE_HOME_URL;
  if (!isRouteNoteTarget(initialUrl)) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_STATE_POLICY_VIOLATION",
      "RouteNote browser refused a non-RouteNote initial URL."
    );
  }

  const processHandle = spawn(
    executable,
    buildChromeArgs({
      profileDir,
      headless: input.headless ?? false,
      initialUrl
    }),
    { stdio: "ignore", env }
  );
  const processState: { error: Error | null; exited: boolean } = {
    error: null,
    exited: false
  };
  processHandle.once("error", error => {
    processState.error = error;
  });
  processHandle.once("exit", () => {
    processState.exited = true;
  });

  let connection: BrowserCdpConnection | null = null;
  try {
    const endpoint = await waitForDevToolsEndpoint(
      profileDir,
      input.launchTimeoutMs ?? 15_000,
      processState
    );
    connection = await BrowserCdpConnection.connect(endpoint);
    const transport = await attachPageSession(connection, initialUrl);
    const port = createRouteNoteCdpPort(transport);

    return {
      port,
      profileDir,
      executable,
      async close() {
        try {
          await connection?.send("Browser.close");
        } catch {
          // Fall through to OS-level termination below.
        } finally {
          connection?.close();
        }
        if (!(await exitedWithin(processHandle, 1_500))) {
          await terminateBrowserProcess(processHandle, processState);
        }
      },
      async waitForClose() {
        await processExitPromise(processHandle);
        connection?.close();
      }
    };
  } catch (error) {
    connection?.close();
    try {
      await terminateBrowserProcess(processHandle, processState);
    } catch (terminationError) {
      throw terminationError;
    }
    if (error instanceof RouteNoteRunnerError) throw error;
    throw new RouteNoteRunnerError(
      "ROUTENOTE_BROWSER_LAUNCH_FAILED",
      "Unable to launch RouteNote browser."
    );
  }
}
