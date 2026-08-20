import { hashPayload } from "@songforge/shared";
import type { VideoGenerationBrief, VideoMutation } from "./domain.ts";

export interface WisebaseExecutionPayload {
  concept: string;
  explanation: string;
  lang: string;
  promptHash: string;
}

export function mutateVideoBrief(
  brief: VideoGenerationBrief,
  mutation: VideoMutation
): VideoGenerationBrief {
  if (mutation === "ROOT" || mutation === "REGENERATE") {
    return {
      ...brief,
      requiredCoverage: [...brief.requiredCoverage],
      visualRequirements: [...brief.visualRequirements]
    };
  }

  if (mutation === "SHORTER") {
    return {
      ...brief,
      requiredCoverage: [...brief.requiredCoverage],
      visualRequirements: [...brief.visualRequirements],
      targetDurationSeconds: Math.max(30, brief.targetDurationSeconds - 10)
    };
  }

  if (mutation === "LONGER") {
    return {
      ...brief,
      requiredCoverage: [...brief.requiredCoverage],
      visualRequirements: [...brief.visualRequirements],
      targetDurationSeconds: Math.min(120, brief.targetDurationSeconds + 15)
    };
  }

  if (mutation === "MORE_CINEMATIC") {
    return {
      ...brief,
      requiredCoverage: [...brief.requiredCoverage],
      visualRequirements: [
        ...brief.visualRequirements,
        "continuous motion, stronger spatial depth, cinematic composition, varied shot scale, no long static ending"
      ]
    };
  }

  return {
    ...brief,
    requiredCoverage: [...brief.requiredCoverage],
    visualRequirements: [
      ...brief.visualRequirements,
      "make each causal mechanism visually explicit before advancing to the next beat"
    ]
  };
}

export function compileWisebasePayload(
  brief: VideoGenerationBrief
): WisebaseExecutionPayload {
  const concept = brief.title;
  const explanation = [
    `For ${brief.audience}, create a ${brief.tone} educational explainer lasting about ${brief.targetDurationSeconds} seconds on: ${brief.topic}.`,
    `It must explicitly cover ${brief.requiredCoverage.join(", ")}; use ${brief.visualRequirements.join(", ")}; captions must remain available as a persistent sidecar in the product wrapper and the ending must keep meaningful motion rather than becoming a long static card.`
  ].join(" ");
  const lang = brief.locale;

  return {
    concept,
    explanation,
    lang,
    promptHash: hashPayload({ concept, explanation, lang })
  };
}
