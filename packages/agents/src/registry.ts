export type ImplementationStatus = "UNIMPLEMENTED" | "PREPARE_ONLY" | "EXECUTABLE";
export type RiskTier = "low" | "moderate" | "high" | "restricted";
export type OperatingClass =
  | "control"
  | "knowledge"
  | "creation"
  | "analysis"
  | "evaluation"
  | "delivery";

export interface RoleContract {
  roleId: string;
  name: string;
  operatingClass: OperatingClass;
  mission: string;
  allowedActions: string[];
  prohibitedActions: string[];
  skills: string[];
  implementationStatus: ImplementationStatus;
  riskTier: RiskTier;
  stopCondition: string;
  nextDefaultRoleId: string;
}

export const ROLE_CATALOG: RoleContract[] = [
  {
    roleId: "CMO-01",
    name: "Artist Operations Orchestrator",
    operatingClass: "control",
    mission: "Sequence CREATE NEXT RELEASE without making creative or legal decisions.",
    allowedActions: ["plan", "dispatch", "record", "block"],
    prohibitedActions: ["approve", "publish", "spend"],
    skills: ["SKL-002", "SKL-003", "SKL-004"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Stop at I4 approval boundary.",
    nextDefaultRoleId: "CMO-04"
  },
  {
    roleId: "CMO-04",
    name: "Creative Director",
    operatingClass: "creation",
    mission: "Turn canon into a structured creative brief.",
    allowedActions: ["draft_brief"],
    prohibitedActions: ["lock_canon", "publish"],
    skills: ["SKL-020", "SKL-021"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Brief remains a draft until specialist work completes.",
    nextDefaultRoleId: "CMA-01"
  },
  {
    roleId: "CMA-01",
    name: "Song Strategy Agent",
    operatingClass: "creation",
    mission: "Produce a song-function brief from canon and catalog facts.",
    allowedActions: ["draft_strategy"],
    prohibitedActions: ["claim_market_facts_without_source"],
    skills: ["SKL-015", "SKL-021"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Strategy is a packet, not a release decision.",
    nextDefaultRoleId: "CMA-02"
  },
  {
    roleId: "CMA-02",
    name: "Lyric Composer",
    operatingClass: "creation",
    mission: "Draft original lyrics under canon constraints.",
    allowedActions: ["draft_lyrics"],
    prohibitedActions: ["approve_lyrics", "imitate_living_artist"],
    skills: ["SKL-020", "SKL-021"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Output is DRAFT until CMA-03 and human lock.",
    nextDefaultRoleId: "CMA-03"
  },
  {
    roleId: "CMA-03",
    name: "Lyric Editor & Originality Reviewer",
    operatingClass: "evaluation",
    mission: "Critique drafts, flag imitation, rank a lock candidate.",
    allowedActions: ["critique", "rank"],
    prohibitedActions: ["final_lyric_approval"],
    skills: ["SKL-021", "SKL-022", "SKL-045"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Human approves locked lyrics.",
    nextDefaultRoleId: "CMO-05"
  },
  {
    roleId: "CMO-05",
    name: "Quality Gatekeeper",
    operatingClass: "evaluation",
    mission: "PASS / CONDITIONAL_PASS / FAIL with evidence. Cannot waive gaps.",
    allowedActions: ["score", "block"],
    prohibitedActions: ["waive_rights", "waive_provenance", "self_approve_creation"],
    skills: ["SKL-040", "SKL-045"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Failed mandatory evidence blocks RELEASE_READY.",
    nextDefaultRoleId: "CMR-02"
  },
  {
    roleId: "CMR-02",
    name: "Release Packager",
    operatingClass: "delivery",
    mission: "Build a completeness checklist and draft distributor package.",
    allowedActions: ["prepare", "hash", "request_authorization"],
    prohibitedActions: ["submit", "mark_live"],
    skills: ["SKL-003", "SKL-040"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "AWAITING_AUTHORIZATION.",
    nextDefaultRoleId: "CMO-06"
  },
  {
    roleId: "CMR-05",
    name: "Platform Optimization Agent",
    operatingClass: "delivery",
    mission: "Prepare DSP and YouTube payloads without submitting.",
    allowedActions: ["prepare"],
    prohibitedActions: ["upload", "publish"],
    skills: ["SKL-040"],
    implementationStatus: "PREPARE_ONLY",
    riskTier: "high",
    stopCondition: "I4 human submit.",
    nextDefaultRoleId: "CMO-06"
  },
  {
    roleId: "CMO-03",
    name: "Voice Governor",
    operatingClass: "evaluation",
    mission: "Protect the one-voice rule.",
    allowedActions: ["inspect", "block"],
    prohibitedActions: ["change_canonical_voice"],
    skills: ["SKL-025"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Placeholder IDs stay UNCONFIGURED.",
    nextDefaultRoleId: "CMA-09"
  },
  {
    roleId: "CMA-09",
    name: "Vocal Direction & Synthesis Agent",
    operatingClass: "creation",
    mission: "Prepare vocal takes only with a configured canonical voice.",
    allowedActions: ["plan_vocals"],
    prohibitedActions: ["label_unconfigured_voice_as_active"],
    skills: ["SKL-025"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "BLOCKED_PROVIDER without ElevenLabs.",
    nextDefaultRoleId: "CMA-10"
  },
  {
    roleId: "CMA-10",
    name: "Vocal QA Agent",
    operatingClass: "evaluation",
    mission: "Score vocal continuity when assets exist.",
    allowedActions: ["score"],
    prohibitedActions: ["hardcode_consistency"],
    skills: ["SKL-025", "SKL-045"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "UNVERIFIED until a real comparator exists.",
    nextDefaultRoleId: "CMA-14"
  },
  {
    roleId: "CMA-14",
    name: "Audio QA Agent",
    operatingClass: "evaluation",
    mission: "Final audio gate.",
    allowedActions: ["score"],
    prohibitedActions: ["waive_master_missing"],
    skills: ["SKL-025", "SKL-045"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Missing master is FAIL.",
    nextDefaultRoleId: "CMV-01"
  },
  {
    roleId: "CMV-01",
    name: "Visual Continuity Director",
    operatingClass: "evaluation",
    mission: "Keep visual identity continuous.",
    allowedActions: ["review"],
    prohibitedActions: ["promote_candidate_to_canon"],
    skills: ["SKL-024"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Generated stills stay candidate.",
    nextDefaultRoleId: "CMV-02"
  },
  {
    roleId: "CMV-02",
    name: "Cover Art & Poster Designer",
    operatingClass: "creation",
    mission: "Draft cover/thumbnail packets.",
    allowedActions: ["draft_art_brief"],
    prohibitedActions: ["publish_art"],
    skills: ["SKL-020"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Art remains candidate without continuity approval.",
    nextDefaultRoleId: "CMK-01"
  },
  {
    roleId: "CMK-01",
    name: "Asset Archivist",
    operatingClass: "knowledge",
    mission: "Require IDs, hashes, and lineage on every deliverable.",
    allowedActions: ["index"],
    prohibitedActions: ["delete_originals"],
    skills: ["SKL-009", "SKL-010"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Missing provenance blocks packaging.",
    nextDefaultRoleId: "CMK-03"
  },
  {
    roleId: "CMK-03",
    name: "Rights & Provenance Recorder",
    operatingClass: "knowledge",
    mission: "Flag rights gaps. Does not give legal advice.",
    allowedActions: ["flag_gaps"],
    prohibitedActions: ["legal_advice", "clear_without_evidence"],
    skills: ["SKL-039", "SKL-010"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Uncleared rights stay open.",
    nextDefaultRoleId: "CMM-01"
  },
  {
    roleId: "CMM-01",
    name: "Content Strategist",
    operatingClass: "creation",
    mission: "Draft 30/60/90 calendars from approved assets only.",
    allowedActions: ["draft_calendar"],
    prohibitedActions: ["post"],
    skills: ["SKL-037"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Public send is I4.",
    nextDefaultRoleId: "CMM-02"
  },
  {
    roleId: "CMM-02",
    name: "Copywriter & Social Voice Agent",
    operatingClass: "creation",
    mission: "Draft captions in canon voice.",
    allowedActions: ["draft_copy"],
    prohibitedActions: ["post", "false_claims"],
    skills: ["SKL-020", "SKL-021"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Draft only.",
    nextDefaultRoleId: "CMM-03"
  },
  {
    roleId: "CMM-03",
    name: "Post Scheduler",
    operatingClass: "delivery",
    mission: "Recommend cadence. Never publish.",
    allowedActions: ["draft_schedule"],
    prohibitedActions: ["post"],
    skills: ["SKL-041"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Human publisher required.",
    nextDefaultRoleId: "CMM-05"
  },
  {
    roleId: "CMM-05",
    name: "Community Triage Agent",
    operatingClass: "analysis",
    mission: "Classify inbound messages. Never handle crisis threads.",
    allowedActions: ["classify"],
    prohibitedActions: ["reply_to_crisis", "legal_medical_advice"],
    skills: ["SKL-036", "SKL-038"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Sensitive classes escalate to humans.",
    nextDefaultRoleId: "CMR-01"
  },
  {
    roleId: "CMR-01",
    name: "Release Calendar Manager",
    operatingClass: "control",
    mission: "Draft calendars and critical paths.",
    allowedActions: ["draft_calendar"],
    prohibitedActions: ["lock_dates_without_owner"],
    skills: ["SKL-002", "SKL-041"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Date locks are human.",
    nextDefaultRoleId: "DAA-07"
  },
  {
    roleId: "DAA-07",
    name: "AI Output Evaluator",
    operatingClass: "evaluation",
    mission: "Regression fixtures for lyric/canon/safety.",
    allowedActions: ["evaluate"],
    prohibitedActions: ["promote_failing_role"],
    skills: ["SKL-032", "SKL-045"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Failures block promotion.",
    nextDefaultRoleId: "GKE-04"
  },
  {
    roleId: "GKE-04",
    name: "Audit Evidence Curator",
    operatingClass: "knowledge",
    mission: "Package provenance for diligence and timelines.",
    allowedActions: ["index_evidence"],
    prohibitedActions: ["certify_compliance"],
    skills: ["SKL-010"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Does not certify.",
    nextDefaultRoleId: "GKE-06"
  },
  {
    roleId: "GKE-06",
    name: "Research & Source Verification Agent",
    operatingClass: "knowledge",
    mission: "Cited acquirer landscape. No outreach.",
    allowedActions: ["research"],
    prohibitedActions: ["buyer_contact", "invent_interest"],
    skills: ["SKL-006", "SKL-007"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "I4 for any send.",
    nextDefaultRoleId: "RCP-08"
  },
  {
    roleId: "RCP-08",
    name: "Partner Ecosystem Research Agent",
    operatingClass: "analysis",
    mission: "Buyer fit shortlist without contact.",
    allowedActions: ["score_fit"],
    prohibitedActions: ["outreach", "commitment"],
    skills: ["SKL-015"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "No outreach.",
    nextDefaultRoleId: "RCP-04"
  },
  {
    roleId: "RCP-04",
    name: "Proposal & RFP Response Agent",
    operatingClass: "creation",
    mission: "Draft teaser/CIM from approved facts only.",
    allowedActions: ["draft_documents"],
    prohibitedActions: ["send_cim", "invent_metrics"],
    skills: ["SKL-020"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Counsel reviews before send.",
    nextDefaultRoleId: "DAA-08"
  },
  {
    roleId: "DAA-08",
    name: "Decision Intelligence Agent",
    operatingClass: "analysis",
    mission: "Sell vs hold vs license options with uncertainty.",
    allowedActions: ["brief"],
    prohibitedActions: ["state_valuation_as_fact"],
    skills: ["SKL-015"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Seller decides.",
    nextDefaultRoleId: "GKE-03"
  },
  {
    roleId: "GKE-03",
    name: "Approval Steward",
    operatingClass: "control",
    mission: "Validate payload hash and expiry. Never impersonate a human.",
    allowedActions: ["validate_authority"],
    prohibitedActions: ["resolve_as_human"],
    skills: ["SKL-004"],
    implementationStatus: "EXECUTABLE",
    riskTier: "high",
    stopCondition: "Humans resolve approvals.",
    nextDefaultRoleId: "CMO-01"
  },
  {
    roleId: "CMO-06",
    name: "Collaboration Coordinator",
    operatingClass: "control",
    mission: "Build reviewer packets. Never approve.",
    allowedActions: ["route"],
    prohibitedActions: ["approve"],
    skills: ["SKL-004"],
    implementationStatus: "EXECUTABLE",
    riskTier: "moderate",
    stopCondition: "Human decision required.",
    nextDefaultRoleId: "GKE-03"
  },
  {
    roleId: "distribution_agent",
    name: "Distribution Agent",
    operatingClass: "delivery",
    mission: "Prepare distributor payload.",
    allowedActions: ["prepare"],
    prohibitedActions: ["submit"],
    skills: ["SKL-040"],
    implementationStatus: "PREPARE_ONLY",
    riskTier: "high",
    stopCondition: "I4 submit.",
    nextDefaultRoleId: "GKE-03"
  },
  {
    roleId: "dsp_publishing_agent",
    name: "DSP Publishing Agent",
    operatingClass: "delivery",
    mission: "DSP checklist only.",
    allowedActions: ["inspect"],
    prohibitedActions: ["submit"],
    skills: ["SKL-040"],
    implementationStatus: "PREPARE_ONLY",
    riskTier: "high",
    stopCondition: "I4 submit.",
    nextDefaultRoleId: "GKE-03"
  },
  {
    roleId: "youtube_agent",
    name: "YouTube Agent",
    operatingClass: "delivery",
    mission: "Prepare private YouTube payload.",
    allowedActions: ["prepare"],
    prohibitedActions: ["upload"],
    skills: ["SKL-040"],
    implementationStatus: "PREPARE_ONLY",
    riskTier: "high",
    stopCondition: "I4 upload.",
    nextDefaultRoleId: "GKE-03"
  }
];

export function getRole(roleId: string): RoleContract {
  const role = ROLE_CATALOG.find((item) => item.roleId === roleId);
  if (!role) throw new Error("ROLE_NOT_FOUND");
  return role;
}

export function assertExecutable(roleId: string): RoleContract {
  const role = getRole(roleId);
  if (role.implementationStatus === "UNIMPLEMENTED") {
    throw new Error("ROLE_UNIMPLEMENTED");
  }
  return role;
}

export function assertNotSelfApprove(creatorRoleId: string, approverRoleId: string): void {
  if (creatorRoleId === approverRoleId) {
    throw new Error("ROLE_CANNOT_SELF_APPROVE");
  }
}
