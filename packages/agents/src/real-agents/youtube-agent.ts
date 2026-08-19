import {
  buildYouTubePayload,
  type ReleasePreparationContext
} from "@songforge/release";

export class YouTubeAgent {
  readonly id = "youtube_agent";
  readonly runbook = {
    name: "YouTube Agent",
    responsibility: "Prepare a private YouTube upload payload for authorization.",
    permittedActions: ["map metadata", "prepare private payload", "hash payload"],
    prohibitedActions: ["upload", "publish", "claim platform availability"]
  } as const;

  prepare(context: ReleasePreparationContext) {
    return {
      agentId: this.id,
      ...buildYouTubePayload(context)
    };
  }
}
