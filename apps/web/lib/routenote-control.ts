import type { RouteNoteExecutionStep } from "@songforge/integrations";
import {
  buildRouteNoteChecklist,
  type ReleasePreparationContext,
  type ReleaseRequirement
} from "@songforge/release";

export type RouteNoteControlStatus =
  | "NOT_CONNECTED"
  | "LOGIN_REQUIRED"
  | "CONNECTED"
  | "PREPARING"
  | "DRAFT_READY"
  | "FAILED";

export interface RouteNoteReadiness {
  ready: boolean;
  groups: {
    audio: boolean;
    artwork: boolean;
    metadata: boolean;
    rights: boolean;
  };
  missingRequirements: ReleaseRequirement[];
}

export interface RouteNoteReleaseOption {
  id: string;
  title: string;
  status: string;
  readiness: RouteNoteReadiness;
}

export interface RouteNoteDraftSummary {
  outcome: "DRAFT_READY";
  releaseId: string;
  payloadHash: string;
  routeNoteReleaseUrl?: string;
  completedSteps: RouteNoteExecutionStep[];
  tracks: Array<{ trackIndex: number; title: string; uploaded: boolean }>;
  artworkUploaded: boolean;
  storesConfigured: boolean;
}

export interface RouteNoteControlError {
  status: RouteNoteControlStatus;
  code: string;
  message: string;
}

export interface RouteNoteControlSnapshot {
  status: Exclude<RouteNoteControlStatus, "PREPARING">;
  hostAvailable: boolean;
  releases: RouteNoteReleaseOption[];
  latestDraft?: RouteNoteDraftSummary;
  error?: { code: string; message: string };
}

const AUDIO_REQUIREMENTS = new Set<ReleaseRequirement>([
  "APPROVED_MASTER",
  "MASTER_DURATION",
  "MASTER_PROVENANCE",
  "ROUTENOTE_AUDIO_FORMAT",
  "ROUTENOTE_AUDIO_TECHNICAL"
]);

const ARTWORK_REQUIREMENTS = new Set<ReleaseRequirement>([
  "APPROVED_COVER_ART",
  "COVER_ART_DIMENSIONS",
  "COVER_ART_PROVENANCE",
  "ROUTENOTE_ARTWORK_FORMAT",
  "ROUTENOTE_ARTWORK_DIMENSIONS",
  "ROUTENOTE_ARTWORK_FILE_SIZE",
  "ROUTENOTE_ARTWORK_COLOR_SPACE"
]);

const METADATA_REQUIREMENTS = new Set<ReleaseRequirement>([
  "COMPLETE_METADATA",
  "ROUTENOTE_REQUIRED_METADATA",
  "ROUTENOTE_ORIGINAL_RELEASE_DATE",
  "ROUTENOTE_SALES_START_DATE",
  "ROUTENOTE_RELEASE_DATE_ORDER",
  "ROUTENOTE_AI_CLASSIFICATION",
  "ROUTENOTE_AI_PROVENANCE"
]);

const RIGHTS_REQUIREMENTS = new Set<ReleaseRequirement>([
  "RIGHTS_APPROVED",
  "OWNERSHIP_CONFIRMED",
  "PROVENANCE_COMPLETE",
  "RIGHTS_WARNINGS_RESOLVED"
]);

function groupReady(
  missingRequirements: ReleaseRequirement[],
  requirements: Set<ReleaseRequirement>
): boolean {
  return !missingRequirements.some(requirement => requirements.has(requirement));
}

export function projectRouteNoteReadiness(
  context: ReleasePreparationContext
): RouteNoteReadiness {
  const checklist = buildRouteNoteChecklist(context);
  const missingRequirements = [...checklist.missingRequirements];

  return {
    ready: checklist.readyForAuthorization,
    groups: {
      audio: groupReady(missingRequirements, AUDIO_REQUIREMENTS),
      artwork: groupReady(missingRequirements, ARTWORK_REQUIREMENTS),
      metadata: groupReady(missingRequirements, METADATA_REQUIREMENTS),
      rights: groupReady(missingRequirements, RIGHTS_REQUIREMENTS)
    },
    missingRequirements
  };
}

function errorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

export function mapRouteNoteControlError(error: unknown): RouteNoteControlError {
  const code = errorCode(error);

  if (code === "ROUTENOTE_BROWSER_NOT_FOUND") {
    return {
      status: "NOT_CONNECTED",
      code,
      message: "RouteNote browser host is not available."
    };
  }

  if (code === "ROUTENOTE_SESSION_REQUIRED" || code === "ROUTENOTE_LOGIN_TIMEOUT") {
    return {
      status: "LOGIN_REQUIRED",
      code,
      message: "Sign in to RouteNote to continue."
    };
  }

  if (code === "ROUTENOTE_UI_CONTRACT_CHANGED") {
    return {
      status: "FAILED",
      code,
      message: "The RouteNote interface changed. Automation stopped safely."
    };
  }

  if (code?.startsWith("ROUTENOTE_")) {
    return {
      status: "FAILED",
      code,
      message: "RouteNote draft preparation could not complete."
    };
  }

  return {
    status: "FAILED",
    code: "ROUTENOTE_CONTROL_FAILED",
    message: "RouteNote control operation failed."
  };
}
