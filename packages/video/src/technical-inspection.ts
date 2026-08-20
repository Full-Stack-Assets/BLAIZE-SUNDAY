export interface TechnicalMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
}

export interface TechnicalInspector {
  inspect(input: string): Promise<TechnicalMetadata>;
}

export type ExecFileLike = (
  file: string,
  args: string[]
) => Promise<{ stdout: string }>;

function parseRational(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const [numeratorRaw, denominatorRaw] = value.split("/");
  if (denominatorRaw === undefined) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) && result > 0 ? result : null;
}

export class FfprobeInspector implements TechnicalInspector {
  private readonly execFile: ExecFileLike;

  constructor(execFile: ExecFileLike) {
    this.execFile = execFile;
  }

  async inspect(input: string): Promise<TechnicalMetadata> {
    const target = input.trim();
    if (!target) throw new Error("TECHNICAL_INPUT_REQUIRED");

    const { stdout } = await this.execFile("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      target
    ]);

    let parsed: any;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      throw new Error("TECHNICAL_METADATA_UNAVAILABLE");
    }

    const stream = Array.isArray(parsed?.streams)
      ? parsed.streams.find((candidate: any) => candidate?.codec_type === "video")
      : null;
    const durationSeconds = Number(parsed?.format?.duration);
    const width = Number(stream?.width);
    const height = Number(stream?.height);
    const fps =
      parseRational(stream?.avg_frame_rate) ??
      parseRational(stream?.r_frame_rate);

    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 ||
      !Number.isInteger(width) ||
      width <= 0 ||
      !Number.isInteger(height) ||
      height <= 0 ||
      fps === null
    ) {
      throw new Error("TECHNICAL_METADATA_UNAVAILABLE");
    }

    return { durationSeconds, width, height, fps };
  }
}
