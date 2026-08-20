import { execFile as nodeExecFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captionTimelineFromWhisperJson,
  type CaptionAlignmentResult,
  type LocalAlignmentProvider
} from "@songforge/video";
import { isTrustedVideoMediaUrl } from "./video-media-url.ts";

export type ExecFileForAlignment = (
  file: string,
  args: string[]
) => Promise<{ stdout: string }>;

function nodeExecutor(timeoutMs: number): ExecFileForAlignment {
  return (file, args) =>
    new Promise((resolve, reject) => {
      nodeExecFile(
        file,
        args,
        {
          encoding: "utf8",
          maxBuffer: 4 * 1024 * 1024,
          timeout: timeoutMs
        },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({ stdout: String(stdout) });
        }
      );
    });
}

export interface NodeWhisperAlignmentOptions {
  execFile?: ExecFileForAlignment;
  modelPath?: string;
  whisperCliPath?: string;
  ffmpegPath?: string;
  timeoutMs?: number;
}

export class NodeWhisperAlignmentProvider implements LocalAlignmentProvider {
  private readonly execFile: ExecFileForAlignment;
  private readonly modelPath: string;
  private readonly whisperCliPath: string;
  private readonly ffmpegPath: string;

  constructor(options: NodeWhisperAlignmentOptions = {}) {
    const timeoutMs = options.timeoutMs ?? 5 * 60_000;
    this.execFile = options.execFile ?? nodeExecutor(timeoutMs);
    this.modelPath = options.modelPath ?? process.env.WHISPER_MODEL_PATH ?? "/models/ggml-base.en.bin";
    this.whisperCliPath = options.whisperCliPath ?? process.env.WHISPER_CLI_PATH ?? "whisper-cli";
    this.ffmpegPath = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  }

  async health(): Promise<"CONFIGURED" | "UNCONFIGURED"> {
    try {
      await access(this.modelPath);
      return "CONFIGURED";
    } catch {
      return "UNCONFIGURED";
    }
  }

  async align(input: {
    mediaPath: string;
    locale: string;
  }): Promise<CaptionAlignmentResult> {
    if (!isTrustedVideoMediaUrl(input.mediaPath)) {
      throw new Error("VIDEO_MEDIA_URL_NOT_ALLOWED");
    }
    if ((await this.health()) !== "CONFIGURED") {
      throw new Error("LOCAL_ALIGNMENT_UNCONFIGURED");
    }

    const workdir = await mkdtemp(join(tmpdir(), "songforge-whisper-"));
    const audioPath = join(workdir, "audio.wav");
    const outputBase = join(workdir, "captions");
    const language = input.locale.trim().split(/[-_]/)[0]?.toLowerCase() || "auto";

    try {
      await this.execFile(this.ffmpegPath, [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        input.mediaPath,
        "-vn",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        audioPath
      ]);

      const audioBytes = await readFile(audioPath);
      const sourceMediaHash = `sha256:${createHash("sha256").update(audioBytes).digest("hex")}`;

      await this.execFile(this.whisperCliPath, [
        "-m",
        this.modelPath,
        "-f",
        audioPath,
        "-l",
        language,
        "--output-json",
        "--no-prints",
        "-of",
        outputBase
      ]);

      const raw = await readFile(`${outputBase}.json`, "utf8");
      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error("INVALID_WHISPER_ALIGNMENT");
      }

      return {
        timeline: captionTimelineFromWhisperJson(payload, input.locale),
        sourceMediaHash
      };
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  }
}
