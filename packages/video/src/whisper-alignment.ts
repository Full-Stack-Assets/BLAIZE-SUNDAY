import {
  normalizeCaptionTimeline,
  type CaptionTimeline
} from "./captions.ts";

type WhisperSegment = {
  timestamps?: { from?: unknown; to?: unknown };
  text?: unknown;
};

function parseWhisperTimestamp(value: unknown): number {
  if (typeof value !== "string") throw new Error("INVALID_WHISPER_ALIGNMENT");
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) throw new Error("INVALID_WHISPER_ALIGNMENT");
  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
}

export function captionTimelineFromWhisperJson(
  payload: unknown,
  locale: string
): CaptionTimeline {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("INVALID_WHISPER_ALIGNMENT");
  }

  const transcription = (payload as { transcription?: unknown }).transcription;
  if (!Array.isArray(transcription) || transcription.length === 0) {
    throw new Error("INVALID_WHISPER_ALIGNMENT");
  }

  try {
    return normalizeCaptionTimeline({
      locale,
      cues: transcription.map(raw => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          throw new Error("INVALID_WHISPER_ALIGNMENT");
        }
        const segment = raw as WhisperSegment;
        if (typeof segment.text !== "string" || !segment.timestamps) {
          throw new Error("INVALID_WHISPER_ALIGNMENT");
        }
        return {
          startSeconds: parseWhisperTimestamp(segment.timestamps.from),
          endSeconds: parseWhisperTimestamp(segment.timestamps.to),
          text: segment.text
        };
      })
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_WHISPER_ALIGNMENT") {
      throw error;
    }
    throw new Error("INVALID_WHISPER_ALIGNMENT");
  }
}
