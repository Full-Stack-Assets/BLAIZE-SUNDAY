export interface CaptionCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface CaptionTimeline {
  locale: string;
  cues: CaptionCue[];
}

export interface LocalAlignmentProvider {
  health(): Promise<"CONFIGURED" | "UNCONFIGURED">;
  align(input: { mediaPath: string; locale: string }): Promise<CaptionTimeline>;
}

function parseTimestamp(value: string): number {
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) throw new Error("INVALID_CAPTION_TIMESTAMP");
  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
}

function formatTimestamp(seconds: number, separator: "," | "."): string {
  const totalMilliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((totalMilliseconds % 60_000) / 1000);
  const millis = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}${separator}${String(millis).padStart(3, "0")}`;
}

export function normalizeCaptionTimeline(
  timeline: CaptionTimeline
): CaptionTimeline {
  const locale = timeline.locale.trim();
  if (!locale) throw new Error("CAPTION_LOCALE_REQUIRED");

  const cues = timeline.cues
    .map(cue => ({
      startSeconds: cue.startSeconds,
      endSeconds: cue.endSeconds,
      text: cue.text.replace(/\s+/g, " ").trim()
    }))
    .sort((a, b) => a.startSeconds - b.startSeconds);

  let previousEnd = 0;
  for (const cue of cues) {
    if (!cue.text) throw new Error("EMPTY_CAPTION_TEXT");
    if (
      !Number.isFinite(cue.startSeconds) ||
      !Number.isFinite(cue.endSeconds) ||
      cue.startSeconds < 0 ||
      cue.endSeconds <= cue.startSeconds
    ) {
      throw new Error("INVALID_CAPTION_TIMING");
    }
    if (cue.startSeconds < previousEnd) throw new Error("OVERLAPPING_CAPTIONS");
    previousEnd = cue.endSeconds;
  }

  return { locale, cues };
}

function parseTimedText(input: string, locale: string): CaptionTimeline {
  const normalized = input.replace(/\r\n/g, "\n").trim();
  const body = normalized.startsWith("WEBVTT")
    ? normalized.replace(/^WEBVTT[^\n]*\n?/, "").trim()
    : normalized;

  const cues: CaptionCue[] = [];
  for (const block of body.split(/\n{2,}/)) {
    const lines = block.split("\n").map(line => line.trimEnd());
    const timingIndex = lines.findIndex(line => line.includes("-->"));
    if (timingIndex < 0) continue;
    const [rawStart, rawEndWithSettings] = lines[timingIndex].split("-->");
    if (!rawStart || !rawEndWithSettings) throw new Error("INVALID_CAPTION_TIMESTAMP");
    const rawEnd = rawEndWithSettings.trim().split(/\s+/)[0] ?? "";
    const text = lines.slice(timingIndex + 1).join(" ");
    cues.push({
      startSeconds: parseTimestamp(rawStart),
      endSeconds: parseTimestamp(rawEnd),
      text
    });
  }

  if (!cues.length) throw new Error("INVALID_CAPTION_FORMAT");
  return normalizeCaptionTimeline({ locale, cues });
}

export function parseSrt(input: string, locale: string): CaptionTimeline {
  return parseTimedText(input, locale);
}

export function parseVtt(input: string, locale: string): CaptionTimeline {
  return parseTimedText(input, locale);
}

export function toSrt(timeline: CaptionTimeline): string {
  const normalized = normalizeCaptionTimeline(timeline);
  return `${normalized.cues
    .map(
      (cue, index) =>
        `${index + 1}\n${formatTimestamp(cue.startSeconds, ",")} --> ${formatTimestamp(cue.endSeconds, ",")}\n${cue.text}`
    )
    .join("\n\n")}\n`;
}

export function toVtt(timeline: CaptionTimeline): string {
  const normalized = normalizeCaptionTimeline(timeline);
  return `WEBVTT\n\n${normalized.cues
    .map(
      cue =>
        `${formatTimestamp(cue.startSeconds, ".")} --> ${formatTimestamp(cue.endSeconds, ".")}\n${cue.text}`
    )
    .join("\n\n")}\n`;
}

export class UnconfiguredLocalAlignmentProvider implements LocalAlignmentProvider {
  async health(): Promise<"UNCONFIGURED"> {
    return "UNCONFIGURED";
  }

  async align(): Promise<CaptionTimeline> {
    throw new Error("LOCAL_ALIGNMENT_UNCONFIGURED");
  }
}
