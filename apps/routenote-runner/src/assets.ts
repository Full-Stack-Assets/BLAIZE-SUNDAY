import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RouteNoteRunnerError } from "./errors.ts";

export interface ResolveVerifiedAssetInput {
  fileUrl: string;
  sha256: string;
  contentType: string;
  workspaceRoot: string;
  cacheDir: string;
  fetchImpl?: typeof fetch;
}

function contentTypeExtension(contentType: string): string {
  switch (contentType.trim().toLowerCase()) {
    case "audio/flac":
      return ".flac";
    case "audio/mpeg":
    case "audio/mp3":
      return ".mp3";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    default:
      return ".bin";
  }
}

async function hashFile(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

async function requireVerifiedFile(
  path: string,
  expectedSha256: string
): Promise<string> {
  let info;
  try {
    info = await stat(path);
  } catch {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      `RouteNote asset does not exist: ${path}`
    );
  }

  if (!info.isFile()) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      `RouteNote asset is not a regular file: ${path}`
    );
  }

  const actualSha256 = await hashFile(path);
  if (actualSha256.toLowerCase() !== expectedSha256.trim().toLowerCase()) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_HASH_MISMATCH",
      `RouteNote asset hash mismatch for ${path}`
    );
  }

  return resolve(path);
}

function localPathFromSource(fileUrl: string, workspaceRoot: string): string | null {
  if (isAbsolute(fileUrl)) return resolve(fileUrl);

  if (fileUrl.startsWith("file://")) {
    try {
      return resolve(fileURLToPath(fileUrl));
    } catch {
      throw new RouteNoteRunnerError(
        "ROUTENOTE_ASSET_UNRESOLVABLE",
        `Invalid file URL: ${fileUrl}`
      );
    }
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(fileUrl)) return null;
  return resolve(workspaceRoot, fileUrl);
}

async function downloadVerifiedAsset(
  input: ResolveVerifiedAssetInput,
  source: URL
): Promise<string> {
  await mkdir(input.cacheDir, { recursive: true });
  const normalizedHash = input.sha256.trim().toLowerCase();
  const finalPath = resolve(
    input.cacheDir,
    `${normalizedHash}${contentTypeExtension(input.contentType)}`
  );

  try {
    return await requireVerifiedFile(finalPath, normalizedHash);
  } catch (error) {
    if (
      error instanceof RouteNoteRunnerError &&
      error.code === "ROUTENOTE_ASSET_HASH_MISMATCH"
    ) {
      await rm(finalPath, { force: true });
    } else if (
      error instanceof RouteNoteRunnerError &&
      error.code !== "ROUTENOTE_ASSET_UNRESOLVABLE"
    ) {
      throw error;
    }
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(source.href);
  } catch (error) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      `Unable to download RouteNote asset ${source.href}: ${String(error)}`
    );
  }

  if (!response.ok) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      `RouteNote asset download returned HTTP ${response.status}: ${source.href}`
    );
  }

  const temporaryPath = `${finalPath}.part-${randomUUID()}`;
  try {
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(temporaryPath, bytes);
    await requireVerifiedFile(temporaryPath, normalizedHash);
    await rename(temporaryPath, finalPath);
    return finalPath;
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (error instanceof RouteNoteRunnerError) throw error;
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      `Unable to cache RouteNote asset ${source.href}: ${String(error)}`
    );
  }
}

export async function resolveVerifiedAsset(
  input: ResolveVerifiedAssetInput
): Promise<string> {
  const fileUrl = input.fileUrl.trim();
  if (!fileUrl || !/^[a-f0-9]{64}$/i.test(input.sha256.trim())) {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      "RouteNote asset requires a source and canonical SHA-256"
    );
  }

  const localPath = localPathFromSource(fileUrl, input.workspaceRoot);
  if (localPath) {
    return requireVerifiedFile(localPath, input.sha256);
  }

  let source: URL;
  try {
    source = new URL(fileUrl);
  } catch {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      `Unsupported RouteNote asset source: ${fileUrl}`
    );
  }

  if (source.protocol !== "https:" && source.protocol !== "http:") {
    throw new RouteNoteRunnerError(
      "ROUTENOTE_ASSET_UNRESOLVABLE",
      `Unsupported RouteNote asset protocol: ${source.protocol}`
    );
  }

  return downloadVerifiedAsset(input, source);
}
