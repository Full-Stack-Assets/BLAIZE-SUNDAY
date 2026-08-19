import { parseEnvelope, type HandoffEnvelope } from "./envelope.ts";

export function skillTaskDecomposition(goal: string): string[] {
  return [
    "CMO-01 plan",
    "CMO-04 brief",
    "CMA-01 strategy",
    "CMA-02 lyrics",
    "CMA-03 critique",
    "CMO-05 gate",
    "CMR-02 package",
    `goal:${goal}`
  ];
}

export function skillHandoffValidation(value: unknown): HandoffEnvelope {
  const envelope = parseEnvelope(value);
  if (!envelope.next_handoff.role_id) {
    throw new Error("HANDOFF_OWNER_REQUIRED");
  }
  if (envelope.status === "RELEASE_READY" && envelope.quality_evidence.passed_gates.length === 0) {
    throw new Error("HANDOFF_EVIDENCE_REQUIRED");
  }
  return envelope;
}

export function skillApprovalRouting(actionType: string): string {
  if (actionType.includes("BUYER") || actionType.includes("PUBLISH")) return "human_principal";
  return "approval_steward";
}

export function skillProvenance(input: {
  sources: string[];
  workflowVersion: string;
}): { complete: boolean; missing: string[] } {
  const missing = input.sources.length ? [] : ["source_ids"];
  return { complete: missing.length === 0, missing };
}

export function skillCanonConformance(text: string, prohibited: readonly string[]): string[] {
  return prohibited.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
}

export function skillPackageValidation(checklist: Record<string, boolean>): {
  ready: boolean;
  missing: string[];
} {
  const missing = Object.entries(checklist)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  return { ready: missing.length === 0, missing };
}

export function skillGateScorecard(input: {
  mandatory: Record<string, boolean>;
  optional: Record<string, boolean>;
}): "PASS" | "CONDITIONAL_PASS" | "FAIL" {
  const mandatoryFail = Object.values(input.mandatory).some((ok) => !ok);
  if (mandatoryFail) return "FAIL";
  const optionalFail = Object.values(input.optional).some((ok) => !ok);
  return optionalFail ? "CONDITIONAL_PASS" : "PASS";
}
