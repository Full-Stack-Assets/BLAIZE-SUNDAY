import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  open,
  realpath,
  rename,
  rm,
  stat
} from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RouteNoteRunnerError } from "./errors.ts";
import {
  ensurePrivateDirectory,
  isPathWithin,
  routeNoteMediaRoot
} from "./state.ts";

export interface ResolveVerifiedAssetInput {
  fileUrl: string;
  sha256: string;
  contentType: string;
  workspaceRoot: string;
  cacheDir: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}

function contentTypeExtension(contentType: string): string {
  switch (contentType.trim().toLowerCase()) {
    case "audio/flac": return ".flac";
    case "audio/mpeg":
    case "audio/mp3": return ".mp3";
    case "audio/wav":
    case "audio/x-wav": return ".wav";
    case "image/jpeg":
    case "image/jpg": return ".jpg";
    case "image/png": return ".png";
    default: return ".bin";
  }
}

function assetError(code: "ROUTENOTE_ASSET_UNRESOLVABLE" | "ROUTENOTE_ASSET_HASH_MISMATCH") {
  return new RouteNoteRunnerError(
    code,
    code === "ROUTENOTE_ASSET_HASH_MISMATCH"
      ? "A RouteNote asset did not match its canonical SHA-256."
      : "A RouteNote asset could not be resolved under the configured production asset policy."
  );
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function requireVerifiedFile(path: string, expectedSha256: string): Promise<string> {
  let info;
  try {
    info = await stat(path);
  } catch {
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }
  if (!info.isFile()) throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  const actualSha256 = await hashFile(path);
  if (actualSha256.toLowerCase() !== expectedSha256.trim().toLowerCase()) {
    throw assetError("ROUTENOTE_ASSET_HASH_MISMATCH");
  }
  return resolve(path);
}

function localPathFromSource(fileUrl: string, workspaceRoot: string): string | null {
  if (isAbsolute(fileUrl)) return resolve(fileUrl);
  if (fileUrl.startsWith("file://")) {
    try {
      return resolve(fileURLToPath(fileUrl));
    } catch {
      throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
    }
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(fileUrl)) return null;
  return resolve(workspaceRoot, fileUrl);
}

function maxAssetBytes(env: NodeJS.ProcessEnv): number {
  const raw = env.ROUTENOTE_ASSET_MAX_BYTES?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1_500_000_000;
}

function fetchTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = env.ROUTENOTE_ASSET_FETCH_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 30_000;
}

function allowedRemoteHosts(env: NodeJS.ProcessEnv): Set<string> {
  return new Set(
    (env.ROUTENOTE_ASSET_HOST_ALLOWLIST ?? "")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function assertRemoteSourceAllowed(source: URL, env: NodeJS.ProcessEnv): void {
  if (source.protocol !== "https:" && source.protocol !== "http:") {
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }
  if (env.NODE_ENV !== "production") return;
  if (source.protocol !== "https:") throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  const allowlist = allowedRemoteHosts(env);
  if (allowlist.size === 0 || !allowlist.has(source.hostname.toLowerCase())) {
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }
}

async function fetchFollowingAllowedRedirects(
  fetchImpl: typeof fetch,
  source: URL,
  env: NodeJS.ProcessEnv
): Promise<Response> {
  let current = source;
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    assertRemoteSourceAllowed(current, env);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs(env));
    timeout.unref?.();
    let response: Response;
    try {
      response = await fetchImpl(current.href, {
        redirect: "manual",
        signal: controller.signal
      });
    } catch {
      throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
    } finally {
      clearTimeout(timeout);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirect === 5) throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
      try {
        current = new URL(location, current);
      } catch {
        throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
      }
      continue;
    }
    if (!response.ok) throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
    return response;
  }
  throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
}

async function streamVerifiedResponse(
  response: Response,
  temporaryPath: string,
  expectedHash: string,
  maxBytes: number
): Promise<void> {
  const contentLength = Number(response.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }
  if (!response.body) throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");

  const handle = await open(temporaryPath, "wx", 0o600);
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
      hash.update(value);
      await handle.write(value);
    }
    await handle.sync();
  } finally {
    await handle.close();
  }

  if (hash.digest("hex").toLowerCase() !== expectedHash.toLowerCase()) {
    throw assetError("ROUTENOTE_ASSET_HASH_MISMATCH");
  }
}

async function downloadVerifiedAsset(
  input: ResolveVerifiedAssetInput,
  source: URL
): Promise<string> {
  const env = input.env ?? process.env;
  await ensurePrivateDirectory(input.cacheDir);
  const normalizedHash = input.sha256.trim().toLowerCase();
  const finalPath = resolve(
    input.cacheDir,
    `${normalizedHash}${contentTypeExtension(input.contentType)}`
  );

  try {
    return await requireVerifiedFile(finalPath, normalizedHash);
  } catch (error) {
    if (error instanceof RouteNoteRunnerError && error.code === "ROUTENOTE_ASSET_HASH_MISMATCH") {
      await rm(finalPath, { force: true });
    } else if (error instanceof RouteNoteRunnerError && error.code !== "ROUTENOTE_ASSET_UNRESOLVABLE") {
      throw error;
    }
  }

  const response = await fetchFollowingAllowedRedirects(input.fetchImpl ?? fetch, source, env);
  const temporaryPath = `${finalPath}.part-${randomUUID()}`;
  try {
    await streamVerifiedResponse(response, temporaryPath, normalizedHash, maxAssetBytes(env));
    await rename(temporaryPath, finalPath);
    await chmod(finalPath, 0o600);
    return finalPath;
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (error instanceof RouteNoteRunnerError) throw error;
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }
}

async function canonicalProductionLocalPath(
  localPath: string,
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): Promise<string> {
  try {
    const [canonicalLocal, canonicalRoot] = await Promise.all([
      realpath(localPath),
      realpath(routeNoteMediaRoot(workspaceRoot, env))
    ]);
    if (!isPathWithin(canonicalLocal, canonicalRoot)) {
      throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
    }
    return canonicalLocal;
  } catch (error) {
    if (error instanceof RouteNoteRunnerError) throw error;
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }
}

export async function resolveVerifiedAsset(
  input: ResolveVerifiedAssetInput
): Promise<string> {
  const env = input.env ?? process.env;
  const fileUrl = input.fileUrl.trim();
  if (!fileUrl || !/^[a-f0-9]{64}$/i.test(input.sha256.trim())) {
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }

  const localPath = localPathFromSource(fileUrl, input.workspaceRoot);
  if (localPath) {
    const verifiedPath =
      env.NODE_ENV === "production"
        ? await canonicalProductionLocalPath(localPath, input.workspaceRoot, env)
        : localPath;
    return requireVerifiedFile(verifiedPath, input.sha256);
  }

  let source: URL;
  try {
    source = new URL(fileUrl);
  } catch {
    throw assetError("ROUTENOTE_ASSET_UNRESOLVABLE");
  }
  assertRemoteSourceAllowed(source, env);
  return downloadVerifiedAsset(input, source);
}
