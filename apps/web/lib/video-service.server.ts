import {
  PrismaVideoRunRepository,
  VideoRunService,
  type VideoRunRecord
} from "@songforge/video";
import { createNodeFfprobeInspector } from "./ffprobe.server";
import { NodeWhisperAlignmentProvider } from "./whisper-alignment.server";

export const videoRunRepository = new PrismaVideoRunRepository();
export const videoRunService = new VideoRunService(
  videoRunRepository,
  createNodeFfprobeInspector(),
  new NodeWhisperAlignmentProvider()
);

export function executionPayloadFromRun(run: VideoRunRecord) {
  const brief = run.brief as { locale?: string };
  return {
    provider: "WISEBASE" as const,
    mode: "CONNECTOR_MEDIATED" as const,
    concept: run.compiledConcept,
    explanation: run.compiledExplanation,
    lang: brief.locale ?? "en",
    promptHash: run.promptHash
  };
}
