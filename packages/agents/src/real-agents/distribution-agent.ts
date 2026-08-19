import {
  buildDistributionPayload,
  type ReleasePreparationContext
} from "@songforge/release";

export class DistributionAgent {
  readonly id = "distribution_agent";
  readonly runbook = {
    name: "Distribution Agent",
    responsibility: "Prepare a deterministic distributor payload for authorization.",
    permittedActions: ["validate", "prepare", "hash", "request authorization"],
    prohibitedActions: [
      "submit without a matching unexpired approval",
      "mark a release live",
      "invent provider receipts"
    ]
  } as const;

  prepare(context: ReleasePreparationContext, provider: string) {
    return {
      agentId: this.id,
      ...buildDistributionPayload(context, provider)
    };
  }
}
