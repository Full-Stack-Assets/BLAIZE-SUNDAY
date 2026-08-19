import { z } from "zod";

export const EnvelopeStatus = z.enum([
  "INTAKE",
  "PLANNED",
  "IN_PROGRESS",
  "DRAFT",
  "NEEDS_REVIEW",
  "APPROVED_FOR_NEXT_GATE",
  "BLOCKED",
  "REJECTED",
  "RELEASE_READY",
  "COMPLETED",
  "ARCHIVED"
]);

export type EnvelopeStatus = z.infer<typeof EnvelopeStatus>;

export const HandoffEnvelopeSchema = z.object({
  status: EnvelopeStatus,
  role_id: z.string().min(1),
  work_item_id: z.string().min(1),
  version: z.string().min(1),
  inputs: z.array(
    z.object({
      asset_or_source_id: z.string(),
      status: z.enum(["approved", "provisional", "unverified"])
    })
  ),
  action_performed: z.string(),
  outputs: z.array(
    z.object({
      asset_id: z.string(),
      location: z.string(),
      version: z.string()
    })
  ),
  provenance: z.object({
    tools: z.array(z.string()),
    source_ids: z.array(z.string()),
    prompt_or_workflow_version: z.string(),
    rights_or_usage_status: z.string()
  }),
  quality_evidence: z.object({
    passed_gates: z.array(z.string()),
    findings: z.array(z.string())
  }),
  risks_and_uncertainties: z.array(z.string()),
  required_human_decision: z.string(),
  next_handoff: z.object({
    role_id: z.string().min(1),
    required_inputs: z.array(z.string())
  })
});

export type HandoffEnvelope = z.infer<typeof HandoffEnvelopeSchema>;

export function parseEnvelope(value: unknown): HandoffEnvelope {
  return HandoffEnvelopeSchema.parse(value);
}

export function envelope(partial: HandoffEnvelope): HandoffEnvelope {
  return HandoffEnvelopeSchema.parse(partial);
}
