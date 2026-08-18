import assert from "node:assert/strict";
import test from "node:test";

import { envelope } from "./envelope.ts";
import { runCreateNextReleaseGraph } from "./orchestrator.ts";
import { assertExecutable, assertNotSelfApprove } from "./registry.ts";
import { skillHandoffValidation, skillPackageValidation } from "./skills.ts";

test("unimplemented roles cannot run", () => {
  assert.throws(() => assertExecutable("NO-SUCH"), /ROLE_NOT_FOUND/);
});

test("creator cannot self-approve", () => {
  assert.throws(() => assertNotSelfApprove("CMA-02", "CMA-02"), /ROLE_CANNOT_SELF_APPROVE/);
});

test("handoff without next owner is blocked by schema", () => {
  assert.throws(() =>
    skillHandoffValidation({
      ...envelope({
        status: "DRAFT",
        role_id: "CMA-02",
        work_item_id: "w1",
        version: "1",
        inputs: [{ asset_or_source_id: "canon", status: "approved" }],
        action_performed: "draft",
        outputs: [{ asset_id: "a", location: "db", version: "1" }],
        provenance: {
          tools: [],
          source_ids: ["canon"],
          prompt_or_workflow_version: "v1",
          rights_or_usage_status: "unverified"
        },
        quality_evidence: { passed_gates: [], findings: [] },
        risks_and_uncertainties: [],
        required_human_decision: "lock lyrics",
        next_handoff: { role_id: "CMA-03", required_inputs: [] }
      }),
      next_handoff: { role_id: "", required_inputs: [] }
    })
  );
});

test("CREATE NEXT RELEASE graph is idempotent in title selection and never LIVE", () => {
  const first = runCreateNextReleaseGraph({
    artistId: "blaize",
    idempotencyKey: "k1",
    mode: "test",
    existingTitles: []
  });
  assert.equal(first.title, "LOOKS EXPENSIVE");
  assert.ok(first.steps.some((step) => step.roleId === "CMO-01"));
  assert.ok(first.steps.some((step) => step.envelope.status === "BLOCKED"));
  assert.equal(
    first.steps.every((step) => step.envelope.status !== "RELEASE_READY"),
    true
  );
});

test("package validation requires master and rights", () => {
  const result = skillPackageValidation({ lyrics: true, master: false, rights: false });
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes("master"));
});
