import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, lstat } from "node:fs/promises";
import { promisify } from "node:util";

import { prisma } from "@songforge/database";
import { inspectIntegrations } from "@songforge/integrations";
import { getServerApiKey, operatingMode } from "@songforge/llm";

import { resolveChromeExecutable } from "../../routenote-runner/src/browser.ts";
import {
  routeNoteMediaRoot,
  routeNoteProfileDir,
  routeNoteStateRoot
} from "../../routenote-runner/src/state.ts";
import { routeNoteWorkspaceRoot } from "./routenote-runtime.server.ts";

const execFileAsync = promisify(execFile);

async function privateDirectory(path: string): Promise<boolean> {
  try {
    const info = await lstat(path);
    return info.isDirectory() && !info.isSymbolicLink() && (info.mode & 0o077) === 0;
  } catch {
    return false;
  }
}

async function browserRuntime(): Promise<{ available: boolean; version: string | null }> {
  try {
    const executable = await resolveChromeExecutable({
      platform: process.platform,
      env: process.env,
      canExecute: path => access(path, fsConstants.X_OK).then(() => true, () => false)
    });
    const { stdout } = await execFileAsync(executable, ["--version"], {
      timeout: 3000,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        LANG: process.env.LANG
      }
    });
    return { available: true, version: stdout.trim().slice(0, 160) || null };
  } catch {
    return { available: false, version: null };
  }
}

export async function buildHealthReport() {
  let database: "CONNECTED" | "FAILED" | "UNCONFIGURED" = process.env.DATABASE_URL
    ? "FAILED"
    : "UNCONFIGURED";
  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "CONNECTED";
    } catch {
      database = "FAILED";
    }
  }

  const workspaceRoot = routeNoteWorkspaceRoot();
  const [browser, statePrivate, profilePrivate, mediaPrivate] = await Promise.all([
    browserRuntime(),
    privateDirectory(routeNoteStateRoot(workspaceRoot, process.env)),
    privateDirectory(routeNoteProfileDir(workspaceRoot, process.env)),
    privateDirectory(routeNoteMediaRoot(workspaceRoot, process.env))
  ]);

  const production = process.env.NODE_ENV === "production";
  const authorityConfigured = Boolean(process.env.ROUTENOTE_CONTROL_PASSPHRASE?.trim());
  const runtimeReady =
    browser.available && statePrivate && profilePrivate && mediaPrivate && authorityConfigured;
  const ok = production
    ? database === "CONNECTED" && runtimeReady
    : database !== "FAILED";

  return {
    ok,
    product: "songforge-os",
    deploymentSha: process.env.SONGFORGE_BUILD_SHA?.trim() || "unknown",
    mode: operatingMode(),
    auth: {
      approvalTokenConfigured: Boolean(process.env.APPROVAL_API_TOKEN),
      routeNoteOwnerAuthorityConfigured: authorityConfigured
    },
    llm: {
      serverKeyConfigured: Boolean(getServerApiKey())
    },
    database,
    routenote: {
      browser,
      storage: {
        statePrivate,
        profilePrivate,
        mediaPrivate
      },
      selectorContract: process.env.ROUTENOTE_SELECTOR_CONTRACT_VERSION?.trim() || "UNVERIFIED"
    },
    integrations: inspectIntegrations().map(item => ({
      id: item.id,
      status: item.status
    }))
  };
}
