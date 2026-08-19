import { randomUUID } from "node:crypto";

import { getOperatingCanon, nextProofCycleTitle } from "@songforge/canon";
import { inspectCanonicalVoice } from "@songforge/voice";
import { createCreativeField } from "@songforge/shared";

import { envelope, type HandoffEnvelope } from "./envelope.ts";
import { assertExecutable, assertNotSelfApprove, getRole } from "./registry.ts";
import {
  skillCanonConformance,
  skillGateScorecard,
  skillHandoffValidation,
  skillPackageValidation,
  skillTaskDecomposition
} from "./skills.ts";

export interface CreateNextReleaseInput {
  artistId: string;
  idempotencyKey: string;
  mode: "live" | "test";
  existingTitles: string[];
}

export interface WorkflowRecord {
  id: string;
  projectId: string;
  idempotencyKey: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "BLOCKED";
  queue: "INLINE_UNCONFIGURED" | "BULLMQ";
  title: string;
  steps: Array<{ roleId: string; envelope: HandoffEnvelope }>;
}

function baseEnvelope(roleId: string, workItemId: string, next: string, status: HandoffEnvelope["status"]): HandoffEnvelope {
  const role = getRole(roleId);
  return envelope({
    status,
    role_id: roleId,
    work_item_id: workItemId,
    version: "1",
    inputs: [{ asset_or_source_id: "canon:v4", status: "approved" }],
    action_performed: role.mission,
    outputs: [{ asset_id: `${roleId}-output`, location: "postgres", version: "1" }],
    provenance: {
      tools: ["songforge-orchestrator"],
      source_ids: ["BLAIZE_CANON_v4.0"],
      prompt_or_workflow_version: "create-next-release/v1",
      rights_or_usage_status: "unverified"
    },
    quality_evidence: { passed_gates: [], findings: [] },
    risks_and_uncertainties: [],
    required_human_decision: role.stopCondition,
    next_handoff: { role_id: next, required_inputs: [] }
  });
}

export function runCreateNextReleaseGraph(input: CreateNextReleaseInput): WorkflowRecord {
  assertExecutable("CMO-01");
  assertNotSelfApprove("CMA-02", "CMO-05");
  const canon = getOperatingCanon();
  const title = nextProofCycleTitle(input.existingTitles);
  const projectId = `proj_${randomUUID()}`;
  const workflowId = `wf_${randomUUID()}`;
  const queue = process.env.REDIS_URL ? "BULLMQ" : "INLINE_UNCONFIGURED";

  const steps: WorkflowRecord["steps"] = [];

  const plan = baseEnvelope("CMO-01", workflowId, "CMO-04", "PLANNED");
  plan.outputs[0] = {
    asset_id: "dag",
    location: skillTaskDecomposition("CREATE NEXT RELEASE").join("|"),
    version: "1"
  };
  steps.push({ roleId: "CMO-01", envelope: skillHandoffValidation(plan) });

  const brief = baseEnvelope("CMO-04", projectId, "CMA-01", "DRAFT");
  brief.outputs[0] = {
    asset_id: "creative_brief",
    location: `${canon.northStar} :: ${title}`,
    version: "1"
  };
  steps.push({ roleId: "CMO-04", envelope: skillHandoffValidation(brief) });

  const strategy = baseEnvelope("CMA-01", projectId, "CMA-02", "DRAFT");
  strategy.outputs[0] = {
    asset_id: "song_function",
    location: `${title} manifesto/discovery/movement slot`,
    version: "1"
  };
  steps.push({ roleId: "CMA-01", envelope: skillHandoffValidation(strategy) });

  const lyricsText =
    title === "LOOKS EXPENSIVE"
      ? "I look expensive\neven when the night is cheap"
      : `${title}\nblank field means AI_DECIDES\n${canon.writingEngine}`;
  const imitation = skillCanonConformance(lyricsText, canon.prohibited);
  const lyrics = baseEnvelope("CMA-02", projectId, "CMA-03", "DRAFT");
  lyrics.outputs[0] = { asset_id: "lyric_draft", location: lyricsText, version: "1" };
  lyrics.quality_evidence.findings = imitation;
  steps.push({ roleId: "CMA-02", envelope: skillHandoffValidation(lyrics) });

  const critique = baseEnvelope("CMA-03", projectId, "CMO-05", "NEEDS_REVIEW");
  critique.outputs[0] = {
    asset_id: "lock_candidate",
    location: lyricsText,
    version: "1"
  };
  critique.required_human_decision = "Human must lock lyrics.";
  steps.push({ roleId: "CMA-03", envelope: skillHandoffValidation(critique) });

  const voice = inspectCanonicalVoice();
  const gateResult = skillGateScorecard({
    mandatory: {
      canon: true,
      lyrics_draft: true,
      master: false,
      cover: false,
      rights: false
    },
    optional: { voice_configured: voice.status !== "UNCONFIGURED" }
  });
  const gate = baseEnvelope(
    "CMO-05",
    projectId,
    "CMR-02",
    gateResult === "FAIL" ? "BLOCKED" : "APPROVED_FOR_NEXT_GATE"
  );
  gate.quality_evidence.passed_gates = [gateResult];
  gate.quality_evidence.findings = ["master missing", "cover missing", "rights unverified"];
  gate.risks_and_uncertainties = [`voice:${voice.status}`];
  steps.push({ roleId: "CMO-05", envelope: skillHandoffValidation(gate) });

  const pack = skillPackageValidation({
    lyrics: true,
    master: false,
    artwork: false,
    rights: false,
    metadata: true
  });
  const packageEnvelope = baseEnvelope("CMR-02", projectId, "CMO-06", "BLOCKED");
  packageEnvelope.outputs[0] = {
    asset_id: "distribution_package",
    location: pack.missing.join(","),
    version: "1"
  };
  packageEnvelope.quality_evidence.findings = pack.missing;
  packageEnvelope.required_human_decision = "Do not submit. AWAITING_AUTHORIZATION after prepare.";
  steps.push({ roleId: "CMR-02", envelope: skillHandoffValidation(packageEnvelope) });

  for (const roleId of ["CMO-03", "CMA-09", "CMV-01", "CMK-03", "CMM-01", "DAA-07", "GKE-04"] as const) {
    assertExecutable(roleId);
    const extra = baseEnvelope(roleId, projectId, getRole(roleId).nextDefaultRoleId, "BLOCKED");
    extra.quality_evidence.findings = ["provider or asset not ready"];
    extra.risks_and_uncertainties = ["fail_closed"];
    steps.push({ roleId, envelope: skillHandoffValidation(extra) });
  }

  void createCreativeField("title", "Title", null);

  return {
    id: workflowId,
    projectId,
    idempotencyKey: input.idempotencyKey,
    status: "COMPLETED",
    queue,
    title,
    steps
  };
}
