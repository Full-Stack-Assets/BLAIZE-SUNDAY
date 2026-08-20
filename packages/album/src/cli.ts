import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { TRACKS } from "./catalog.ts";
import { bootstrapAlbumTree, buildAlbumManifest } from "./manifest.ts";
import { inspectMedia } from "./media.ts";
import { renderArchiveMasterCandidate, type MasteringProfile } from "./mastering.ts";
import { hashFile, writeChecksumFile, writeProvenanceReceipt } from "./provenance.ts";
import { validateAlbumPackage } from "./validator.ts";

export type CliCommand = "bootstrap" | "audit" | "render" | "validate" | "receipt";
export interface ParsedCli {
  command: CliCommand;
  options: Record<string, string>;
}

function requireOption(options: Record<string, string>, key: string): string {
  const value = options[key];
  if (!value) throw new Error(`--${key} is required`);
  return value;
}

export function parseCli(argv: string[]): ParsedCli {
  const command = argv[0] as CliCommand | undefined;
  if (!command || !["bootstrap", "audit", "render", "validate", "receipt"].includes(command)) {
    throw new Error("album command must be bootstrap, audit, render, validate, or receipt");
  }
  const options: Record<string, string> = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith("--")) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
    options[key] = value;
    index += 1;
  }
  if (command === "bootstrap") requireOption(options, "output");
  if (command === "audit") {
    requireOption(options, "source-map");
    requireOption(options, "write-receipts");
  }
  if (command === "render") {
    requireOption(options, "track");
    requireOption(options, "profile");
    requireOption(options, "source-map");
    requireOption(options, "output");
  }
  if (command === "validate") {
    requireOption(options, "root");
    requireOption(options, "manifest");
  }
  return { command, options };
}

interface SourceMapCandidate {
  role: "original_full_mix" | "cleaned_candidate" | "music_forward_candidate" | "alternate";
  path: string;
}
type SourceMap = Record<string, SourceMapCandidate[]>;

export interface AuditedCandidate extends SourceMapCandidate {
  filename: string;
  sha256: string;
  inspection: Awaited<ReturnType<typeof inspectMedia>>;
  selectionStatus:
    | "selected_for_archive_candidate"
    | "alternate_only"
    | "rejected_corrupt"
    | "needs_human_a_b";
  notes: string[];
}

export interface SourceSelectionReceipt {
  trackId: string;
  generatedAt: string;
  candidates: AuditedCandidate[];
  selectedPath: string | null;
  humanSelectionRequired: boolean;
}

function chooseCandidate(candidates: AuditedCandidate[]): SourceSelectionReceipt["candidates"] {
  const originals = candidates.filter((candidate) => candidate.role === "original_full_mix");
  const cleaned = candidates.filter((candidate) => candidate.role === "cleaned_candidate");
  const musicForward = candidates.filter((candidate) => candidate.role === "music_forward_candidate");

  for (const candidate of musicForward) candidate.selectionStatus = "alternate_only";
  if (cleaned.length > 0 && originals.length > 0) {
    for (const candidate of [...cleaned, ...originals]) candidate.selectionStatus = "needs_human_a_b";
  } else if (cleaned.length === 1) {
    cleaned[0]!.selectionStatus = "selected_for_archive_candidate";
  } else if (originals.length === 1) {
    originals[0]!.selectionStatus = "selected_for_archive_candidate";
  }
  return candidates;
}

export async function auditSourceMap(sourceMapPath: string, receiptsDir: string): Promise<SourceSelectionReceipt[]> {
  const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8")) as SourceMap;
  await mkdir(receiptsDir, { recursive: true });
  const receipts: SourceSelectionReceipt[] = [];

  for (const track of TRACKS.slice(0, 3)) {
    const candidates: AuditedCandidate[] = [];
    for (const candidate of sourceMap[track.id] ?? []) {
      try {
        const inspection = await inspectMedia(candidate.path);
        candidates.push({
          ...candidate,
          filename: basename(candidate.path),
          sha256: await hashFile(candidate.path),
          inspection,
          selectionStatus: candidate.role === "music_forward_candidate" ? "alternate_only" : "needs_human_a_b",
          notes: [],
        });
      } catch (error) {
        candidates.push({
          ...candidate,
          filename: basename(candidate.path),
          sha256: "",
          inspection: {
            codec: null,
            durationSeconds: 0,
            sampleRateHz: null,
            channels: null,
            bitDepth: null,
            formatName: null,
            bitRate: null,
          },
          selectionStatus: "rejected_corrupt",
          notes: [error instanceof Error ? error.message : "unknown audit error"],
        });
      }
    }

    chooseCandidate(candidates);
    const selected = candidates.find((candidate) => candidate.selectionStatus === "selected_for_archive_candidate") ?? null;
    const receipt: SourceSelectionReceipt = {
      trackId: track.id,
      generatedAt: new Date().toISOString(),
      candidates,
      selectedPath: selected?.path ?? null,
      humanSelectionRequired: candidates.some((candidate) => candidate.selectionStatus === "needs_human_a_b"),
    };
    const destination = join(receiptsDir, `${track.id}.json`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    receipts.push(receipt);
  }
  return receipts;
}

async function renderTrack(options: Record<string, string>): Promise<void> {
  const trackId = requireOption(options, "track");
  const profilePath = requireOption(options, "profile");
  const sourceMapPath = requireOption(options, "source-map");
  const outputRoot = requireOption(options, "output");
  const profile = JSON.parse(await readFile(profilePath, "utf8")) as MasteringProfile;
  if (profile.trackId !== trackId) throw new Error("profile track does not match --track");
  const receipt = JSON.parse(await readFile(profile.sourceSelectionReceipt, "utf8")) as SourceSelectionReceipt;
  if (receipt.humanSelectionRequired || !receipt.selectedPath) throw new Error("HUMAN_A_B_REQUIRED");

  const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8")) as SourceMap;
  if (!(sourceMap[trackId] ?? []).some((candidate) => candidate.path === receipt.selectedPath)) {
    throw new Error("selected source is not present in source map");
  }

  const base = join(outputRoot, trackId);
  const wav = join(base, "MASTER", `${trackId}_ARCHIVE_MASTER_24-48.wav`);
  const flac = join(base, "MASTER", `${trackId}_MASTER.flac`);
  const mp3 = join(base, "MASTER", `${trackId}_REFERENCE_320.mp3`);
  await renderArchiveMasterCandidate({ inputPath: receipt.selectedPath, outputWav: wav, outputFlac: flac, outputMp3: mp3, profile });

  const entries = await Promise.all([wav, flac, mp3].map(async (path) => ({ filename: basename(path), sha256: await hashFile(path) })));
  await mkdir(join(base, "METADATA"), { recursive: true });
  await writeChecksumFile(entries, join(base, "METADATA", "checksums.sha256"));
  const selectedCandidate = receipt.candidates.find((candidate) => candidate.path === receipt.selectedPath)!;
  await writeProvenanceReceipt(
    {
      assetId: `${trackId}:archive-master-candidate`,
      trackId,
      filename: basename(wav),
      canonAssetState: "CANDIDATE",
      catalogState: "CURATED_REFERENCE_MASTER",
      evidenceState: "VERIFIED",
      parentAssets: [selectedCandidate.filename],
      sha256: entries[0]!.sha256,
      sourceSha256: selectedCandidate.sha256,
      sourceType: selectedCandidate.role,
      derivationMethod: "per-track archive-remaster render from selected completed mix",
      nativeStem: false,
      canonical: false,
      limitationNotice: "Lossless delivery encoding derived from potentially lossy or previously processed source; not lossless-from-source and not a native-stem master.",
      createdAt: new Date().toISOString(),
    },
    join(base, "METADATA", "provenance.json"),
  );
}

export async function runCli(argv: string[]): Promise<void> {
  const { command, options } = parseCli(argv);
  if (command === "bootstrap") {
    await bootstrapAlbumTree(requireOption(options, "output"));
    return;
  }
  if (command === "audit") {
    await auditSourceMap(requireOption(options, "source-map"), requireOption(options, "write-receipts"));
    return;
  }
  if (command === "render") {
    await renderTrack(options);
    return;
  }
  if (command === "validate") {
    const manifest = JSON.parse(await readFile(requireOption(options, "manifest"), "utf8"));
    const report = await validateAlbumPackage({ root: requireOption(options, "root"), manifest });
    if (options["write-report"]) await writeFile(options["write-report"], `${JSON.stringify(report, null, 2)}\n`, "utf8");
    if (report.status === "FAIL") process.exitCode = 1;
    return;
  }
  const sourceStatePath = requireOption(options, "source-state");
  const manifest = buildAlbumManifest(JSON.parse(await readFile(sourceStatePath, "utf8")));
  const output = requireOption(options, "output");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
