import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  access,
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm
} from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";
import { prisma } from "@songforge/database";

import {
  ROUTENOTE_ARTWORK_MAX_BYTES,
  ROUTENOTE_MASTER_MAX_BYTES,
  inspectRouteNoteJpeg,
  routeNoteArtworkTechnicalProblems,
  routeNoteAudioTechnicalProblems,
  type RouteNoteAudioTechnical,
  type RouteNoteJpegTechnical
} from "./routenote-media-validation.ts";

export type RouteNoteMediaKind = "MASTER" | "COVER_ART";

export interface RouteNoteMediaImportResult {
  releaseId: string;
  kind: RouteNoteMediaKind;
  assetId: string;
  sha256: string;
  contentType: string;
  technical: RouteNoteAudioTechnical | RouteNoteJpegTechnical;
}

export class RouteNoteMediaImportError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RouteNoteMediaImportError";
    this.code = code;
  }
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mediaRoot(env: NodeJS.ProcessEnv): string {
  const configured = env.ROUTENOTE_MEDIA_ROOT?.trim();
  const root = configured || (env.NODE_ENV === "production"
    ? "/data/media"
    : path.resolve(process.cwd(), ".songforge/routenote/media"));
  if (env.NODE_ENV === "production" && !path.isAbsolute(root)) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_STORAGE_INVALID");
  }
  return path.resolve(root);
}

async function ensurePrivateDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_STORAGE_INVALID");
  }
  await chmod(directory, 0o700);
}

function projectDirectoryName(projectId: string): string {
  return `project-${createHash("sha256").update(projectId).digest("hex").slice(0, 24)}`;
}

function declaredContentType(request: Request): string {
  return (request.headers.get("content-type") ?? "")
    .split(";", 1)[0]!
    .trim()
    .toLowerCase();
}

function validateDeclaredContentType(kind: RouteNoteMediaKind, contentType: string): void {
  if (!contentType || contentType === "application/octet-stream") return;
  if (
    kind === "MASTER" &&
    (contentType === "audio/flac" || contentType === "audio/x-flac")
  ) {
    return;
  }
  if (
    kind === "COVER_ART" &&
    (contentType === "image/jpeg" || contentType === "image/jpg")
  ) {
    return;
  }
  throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_CONTENT_TYPE_UNSUPPORTED");
}

async function streamRequestBody(
  request: Request,
  target: string,
  maxBytes: number
): Promise<{ bytes: number; sha256: string }> {
  if (!request.body) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_INPUT_INVALID");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_UPLOAD_TOO_LARGE");
  }

  const handle = await open(target, "wx", 0o600);
  const hash = createHash("sha256");
  let bytes = 0;
  const reader = request.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_UPLOAD_TOO_LARGE");
      }
      hash.update(value);
      await handle.write(value);
    }
    if (bytes === 0) {
      throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_INPUT_INVALID");
    }
    await handle.sync();
    return { bytes, sha256: hash.digest("hex") };
  } finally {
    reader.releaseLock();
    await handle.close();
  }
}

async function readPrefix(filePath: string, length: number): Promise<Buffer> {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function probeFlac(filePath: string, fileSizeBytes: number): Promise<RouteNoteAudioTechnical> {
  const prefix = await readPrefix(filePath, 4);
  if (prefix.toString("ascii") !== "fLaC") {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_CONTENT_TYPE_UNSUPPORTED");
  }

  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      process.env.FFPROBE_BIN?.trim() || "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration,bit_rate:stream=codec_type,channels,sample_rate,bits_per_raw_sample,bits_per_sample,bit_rate,duration",
        "-of", "json",
        filePath
      ],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 20_000,
        env: {
          NODE_ENV: process.env.NODE_ENV ?? "production",
          PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
          LANG: "C"
        }
      },
      (error, output) => {
        if (error) reject(error);
        else resolve(String(output));
      }
    );
  }).catch(() => {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_TECHNICAL_INSPECTION_FAILED");
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_TECHNICAL_INSPECTION_FAILED");
  }

  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const audio = streams.find(item => asRecord(item)?.codec_type === "audio");
  const stream = asRecord(audio);
  const format = asRecord(parsed.format);
  if (!stream || !format) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_TECHNICAL_INSPECTION_FAILED");
  }

  const durationSeconds =
    numberValue(format.duration) ?? numberValue(stream.duration) ?? 0;
  const channels = numberValue(stream.channels) ?? 0;
  const sampleRateHz = numberValue(stream.sample_rate) ?? 0;
  const bitDepth =
    numberValue(stream.bits_per_raw_sample) ??
    numberValue(stream.bits_per_sample) ??
    0;
  const measuredBitrate =
    numberValue(stream.bit_rate) ?? numberValue(format.bit_rate);
  const bitrateKbps = measuredBitrate && measuredBitrate > 0
    ? measuredBitrate / 1000
    : durationSeconds > 0
      ? (fileSizeBytes * 8) / durationSeconds / 1000
      : 0;

  const technical: RouteNoteAudioTechnical = {
    durationSeconds,
    channels,
    sampleRateHz,
    bitDepth,
    bitrateKbps
  };
  if (routeNoteAudioTechnicalProblems(technical).length > 0) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_TECHNICAL_INVALID");
  }
  return technical;
}

async function inspectJpeg(filePath: string): Promise<RouteNoteJpegTechnical> {
  const buffer = await readFile(filePath);
  let technical: RouteNoteJpegTechnical;
  try {
    technical = inspectRouteNoteJpeg(buffer);
  } catch {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_TECHNICAL_INVALID");
  }
  if (routeNoteArtworkTechnicalProblems(technical).length > 0) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_TECHNICAL_INVALID");
  }
  return technical;
}

function nextDspMetadata(
  current: unknown,
  kind: RouteNoteMediaKind,
  technical: RouteNoteAudioTechnical | RouteNoteJpegTechnical
): Prisma.InputJsonValue {
  const dsp = asRecord(current) ?? {};
  const routeNote = asRecord(dsp.routenote) ?? {};

  if (kind === "MASTER") {
    const audio = technical as RouteNoteAudioTechnical;
    return json({
      ...dsp,
      routenote: {
        ...routeNote,
        audio: {
          ...(asRecord(routeNote.audio) ?? {}),
          channels: audio.channels,
          bitrateKbps: audio.bitrateKbps
        }
      }
    });
  }

  const artwork = technical as RouteNoteJpegTechnical;
  return json({
    ...dsp,
    routenote: {
      ...routeNote,
      artwork: {
        ...(asRecord(routeNote.artwork) ?? {}),
        fileSizeBytes: artwork.fileSizeBytes,
        colorSpace: artwork.colorSpace
      }
    }
  });
}

async function finalizeFile(tempPath: string, finalPath: string): Promise<void> {
  try {
    await access(finalPath);
    await rm(tempPath, { force: true });
  } catch {
    await rename(tempPath, finalPath);
  }
}

export async function importRouteNoteMedia(
  request: Request,
  releaseId: string,
  kind: RouteNoteMediaKind,
  env: NodeJS.ProcessEnv = process.env
): Promise<RouteNoteMediaImportResult> {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { id: true, projectId: true, status: true, project: { select: { metadata: { select: { id: true } } } } }
  });
  if (!release) throw new RouteNoteMediaImportError("ROUTENOTE_RELEASE_NOT_FOUND");
  if (release.status !== "PREPARED") {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_RELEASE_STATE_BLOCKED");
  }
  if (!release.project.metadata) {
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_METADATA_REQUIRED");
  }

  const declaredType = declaredContentType(request);
  validateDeclaredContentType(kind, declaredType);

  const root = mediaRoot(env);
  await ensurePrivateDirectory(root);
  const projectDir = path.join(root, projectDirectoryName(release.projectId));
  await ensurePrivateDirectory(projectDir);
  const tempPath = path.join(projectDir, `.${kind.toLowerCase()}.${randomUUID()}.upload`);
  const maxBytes = kind === "MASTER" ? ROUTENOTE_MASTER_MAX_BYTES : ROUTENOTE_ARTWORK_MAX_BYTES;

  try {
    const written = await streamRequestBody(request, tempPath, maxBytes);
    const technical = kind === "MASTER"
      ? await probeFlac(tempPath, written.bytes)
      : await inspectJpeg(tempPath);
    const extension = kind === "MASTER" ? "flac" : "jpg";
    const contentType = kind === "MASTER" ? "audio/flac" : "image/jpeg";
    const storageKey = `${projectDirectoryName(release.projectId)}/${kind === "MASTER" ? "master" : "cover"}-${written.sha256.slice(0, 24)}.${extension}`;
    const finalPath = path.join(root, storageKey);

    const assetId = await prisma.$transaction(async tx => {
      const current = await tx.release.findUnique({
        where: { id: releaseId },
        select: {
          projectId: true,
          status: true,
          project: { select: { metadata: { select: { id: true, dspMetadata: true } } } }
        }
      });
      if (!current) throw new RouteNoteMediaImportError("ROUTENOTE_RELEASE_NOT_FOUND");
      if (current.status !== "PREPARED") {
        throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_RELEASE_STATE_BLOCKED");
      }
      const metadata = current.project.metadata;
      if (!metadata) throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_METADATA_REQUIRED");

      let id: string;
      if (kind === "MASTER") {
        const audio = technical as RouteNoteAudioTechnical;
        await tx.audioAsset.updateMany({
          where: { projectId: current.projectId, type: "MASTER", approved: true },
          data: { approved: false }
        });
        const existing = await tx.audioAsset.findFirst({
          where: { projectId: current.projectId, type: "MASTER", sha256: written.sha256 }
        });
        const record = existing
          ? await tx.audioAsset.update({
              where: { id: existing.id },
              data: {
                fileUrl: finalPath,
                storageKey,
                contentType,
                durationSeconds: audio.durationSeconds,
                sampleRate: audio.sampleRateHz,
                bitDepth: audio.bitDepth,
                verificationStatus: "VERIFIED",
                approved: true,
                generationSettings: json({ source: "OWNER_UPLOAD", sha256Verified: true })
              }
            })
          : await tx.audioAsset.create({
              data: {
                projectId: current.projectId,
                type: "MASTER",
                fileUrl: finalPath,
                storageKey,
                sha256: written.sha256,
                contentType,
                durationSeconds: audio.durationSeconds,
                sampleRate: audio.sampleRateHz,
                bitDepth: audio.bitDepth,
                verificationStatus: "VERIFIED",
                approved: true,
                generationSettings: json({ source: "OWNER_UPLOAD", sha256Verified: true })
              }
            });
        id = record.id;
      } else {
        const artwork = technical as RouteNoteJpegTechnical;
        await tx.visualAsset.updateMany({
          where: { projectId: current.projectId, type: "COVER_ART", approved: true },
          data: { approved: false }
        });
        const existing = await tx.visualAsset.findFirst({
          where: { projectId: current.projectId, type: "COVER_ART", sha256: written.sha256 }
        });
        const record = existing
          ? await tx.visualAsset.update({
              where: { id: existing.id },
              data: {
                fileUrl: finalPath,
                storageKey,
                contentType,
                width: artwork.width,
                height: artwork.height,
                verificationStatus: "VERIFIED",
                approved: true
              }
            })
          : await tx.visualAsset.create({
              data: {
                projectId: current.projectId,
                type: "COVER_ART",
                fileUrl: finalPath,
                storageKey,
                sha256: written.sha256,
                contentType,
                width: artwork.width,
                height: artwork.height,
                verificationStatus: "VERIFIED",
                approved: true
              }
            });
        id = record.id;
      }

      await tx.releaseMetadata.update({
        where: { id: metadata.id },
        data: { dspMetadata: nextDspMetadata(metadata.dspMetadata, kind, technical) }
      });

      await finalizeFile(tempPath, finalPath);

      await tx.releaseEvent.create({
        data: {
          releaseId,
          type: "CANONICAL_MEDIA_IMPORTED",
          actor: "SONGFORGE_OWNER",
          evidence: json({
            kind,
            assetId: id,
            sha256: written.sha256,
            contentType,
            technical
          })
        }
      });
      return id;
    });

    return {
      releaseId,
      kind,
      assetId,
      sha256: written.sha256,
      contentType,
      technical
    };
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    if (error instanceof RouteNoteMediaImportError) throw error;
    throw new RouteNoteMediaImportError("ROUTENOTE_MEDIA_IMPORT_FAILED");
  }
}
