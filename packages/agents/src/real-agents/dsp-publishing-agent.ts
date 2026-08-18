import {
  buildDspChecklist,
  type ReleasePreparationContext
} from "@songforge/release";

export class DspPublishingAgent {
  readonly id = "dsp_publishing_agent";
  readonly runbook = {
    name: "DSP Publishing Agent",
    responsibility: "Validate the release package against DSP requirements.",
    permittedActions: ["inspect", "report missing requirements"],
    prohibitedActions: ["submit", "publish", "waive rights requirements"]
  } as const;

  inspect(context: ReleasePreparationContext) {
    return {
      agentId: this.id,
      ...buildDspChecklist(context)
    };
  }
}
