export type ProjectStatus = "IDEA" | "DRAFT" | "IN_PROGRESS" | "REVIEW" | "LOCKED";

/** Release state machine (from Songforge OS) */
export type ReleaseStage =
  | "PREPARED"
  | "AWAITING_AUTHORIZATION"
  | "SUBMITTED"
  | "ACCEPTED"
  | "SCHEDULED"
  | "LIVE";

export type SectionId =
  | "intro"
  | "verse1"
  | "pre1"
  | "chorus"
  | "verse2"
  | "pre2"
  | "chorus2"
  | "bridge"
  | "final"
  | "outro";

export interface SongVersion {
  id: string;
  createdAt: string;
  label: string;
  lyrics: Record<SectionId, string>;
  notes: string;
  source: "manual" | "forge" | "restore";
}

export interface SongProject {
  id: string;
  title: string;
  status: ProjectStatus;
  role: string;
  progress: number;
  lastTouched: string;
  lyrics: Record<SectionId, string>;
  notes: string;
  versions: SongVersion[];
  currentVersionId: string | null;
  releaseStage: ReleaseStage | null;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_CHANGES";

export interface ApprovalItem {
  id: string;
  type: "SECTION" | "FULL_TRACK" | "RELEASE_PACKAGE" | "VISUAL" | "METADATA";
  title: string;
  projectId: string;
  projectTitle: string;
  summary: string;
  createdAt: string;
  status: ApprovalStatus;
  risk: "LOW" | "MODERATE" | "HIGH";
  requiredBy: string;
  payloadPreview?: string;
}

export const SECTION_ORDER: { id: SectionId; label: string }[] = [
  { id: "intro", label: "INTRO" },
  { id: "verse1", label: "VERSE 1" },
  { id: "pre1", label: "PRE" },
  { id: "chorus", label: "CHORUS" },
  { id: "verse2", label: "VERSE 2" },
  { id: "pre2", label: "PRE" },
  { id: "chorus2", label: "CHORUS" },
  { id: "bridge", label: "BRIDGE" },
  { id: "final", label: "FINAL CHORUS" },
  { id: "outro", label: "OUTRO" },
];

export type AgentRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "BLOCKED"
  | "CANCELLED";

export interface AgentRun {
  id: string;
  agentRole: string;
  projectId: string | null;
  projectTitle: string | null;
  action: string;
  status: AgentRunStatus;
  startedAt: string;
  finishedAt: string | null;
  summary: string;
  risk: "LOW" | "MODERATE" | "HIGH";
  requiresApproval: boolean;
}
