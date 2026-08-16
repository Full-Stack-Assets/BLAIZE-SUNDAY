import { hashPayload } from "../../shared/src/domain.ts";

export interface ReleasePreparationContext {
  releaseId: string;
  projectId: string;
  status: "PREPARED" | "AWAITING_AUTHORIZATION";
  artistName: string;
  title: string;
  master: {
    id: string;
    fileUrl: string;
    sha256: string;
    approved: boolean;
    durationSeconds: number;
    contentType: string;
  } | null;
  coverArt: {
    id: string;
    fileUrl: string;
    sha256: string;
    approved: boolean;
    width: number;
    height: number;
    contentType: string;
  } | null;
  metadata: {
    title: string;
    artistName: string;
    genre: string;
    subgenre: string;
    language: string;
    explicit: boolean;
    description: string;
    tags: string[];
    credits: Record<string, unknown>;
  } | null;
  rights: {
    approved: boolean;
    ownershipConfirmed: boolean;
    provenanceComplete: boolean;
    warnings: string[];
  };
}

export type DspRequirement =
  | "APPROVED_MASTER"
  | "MASTER_DURATION"
  | "MASTER_PROVENANCE"
  | "APPROVED_COVER_ART"
  | "COVER_ART_DIMENSIONS"
  | "COVER_ART_PROVENANCE"
  | "COMPLETE_METADATA"
  | "RIGHTS_APPROVED"
  | "OWNERSHIP_CONFIRMED"
  | "PROVENANCE_COMPLETE"
  | "RIGHTS_WARNINGS_RESOLVED";

export interface DspChecklist {
  readyForAuthorization: boolean;
  missingRequirements: DspRequirement[];
  checks: Record<DspRequirement, boolean>;
}

function isMetadataComplete(context: ReleasePreparationContext): boolean {
  const metadata = context.metadata;
  return Boolean(
    metadata?.title.trim() &&
      metadata.artistName.trim() &&
      metadata.genre.trim() &&
      metadata.language.trim() &&
      Object.keys(metadata.credits).length
  );
}

export function buildDspChecklist(
  context: ReleasePreparationContext
): DspChecklist {
  const checks: Record<DspRequirement, boolean> = {
    APPROVED_MASTER: Boolean(context.master?.approved),
    MASTER_DURATION: Boolean(
      context.master &&
        context.master.durationSeconds >= 30 &&
        context.master.durationSeconds <= 600
    ),
    MASTER_PROVENANCE: Boolean(
      context.master?.fileUrl && /^[a-f0-9]{64}$/i.test(context.master.sha256)
    ),
    APPROVED_COVER_ART: Boolean(context.coverArt?.approved),
    COVER_ART_DIMENSIONS: Boolean(
      context.coverArt &&
        context.coverArt.width >= 3000 &&
        context.coverArt.height >= 3000 &&
        context.coverArt.width === context.coverArt.height
    ),
    COVER_ART_PROVENANCE: Boolean(
      context.coverArt?.fileUrl &&
        /^[a-f0-9]{64}$/i.test(context.coverArt.sha256)
    ),
    COMPLETE_METADATA: isMetadataComplete(context),
    RIGHTS_APPROVED: context.rights.approved,
    OWNERSHIP_CONFIRMED: context.rights.ownershipConfirmed,
    PROVENANCE_COMPLETE: context.rights.provenanceComplete,
    RIGHTS_WARNINGS_RESOLVED: context.rights.warnings.length === 0
  };

  const missingRequirements = (Object.entries(checks) as [DspRequirement, boolean][])
    .filter(([, passed]) => !passed)
    .map(([requirement]) => requirement);

  return {
    readyForAuthorization: missingRequirements.length === 0,
    missingRequirements,
    checks
  };
}

export class ReleasePayloadError extends Error {
  readonly code: string;
  readonly missingRequirements: DspRequirement[];

  constructor(
    code: string,
    missingRequirements: DspRequirement[] = []
  ) {
    super(code);
    this.name = "ReleasePayloadError";
    this.code = code;
    this.missingRequirements = missingRequirements;
  }
}

export function buildDistributionPayload(
  context: ReleasePreparationContext,
  provider: string
) {
  const checklist = buildDspChecklist(context);
  if (!checklist.readyForAuthorization) {
    throw new ReleasePayloadError(
      "RELEASE_PACKAGE_INCOMPLETE",
      checklist.missingRequirements
    );
  }

  if (context.status !== "PREPARED") {
    throw new ReleasePayloadError("RELEASE_NOT_PREPARED");
  }

  const payload = {
    provider,
    releaseId: context.releaseId,
    projectId: context.projectId,
    releaseType: "SINGLE",
    artistName: context.artistName,
    title: context.title,
    master: context.master,
    coverArt: context.coverArt,
    metadata: context.metadata,
    rights: context.rights
  };

  return {
    payload,
    payloadHash: hashPayload(payload),
    checklist,
    nextStatus: "AWAITING_AUTHORIZATION" as const,
    submissionPerformed: false
  };
}

export function buildYouTubePayload(context: ReleasePreparationContext) {
  const checklist = buildDspChecklist(context);
  if (!checklist.readyForAuthorization || !context.master || !context.coverArt) {
    throw new ReleasePayloadError(
      "RELEASE_PACKAGE_INCOMPLETE",
      checklist.missingRequirements
    );
  }

  const payload = {
    title: `${context.artistName} — ${context.title}`,
    description: context.metadata?.description ?? "",
    tags: context.metadata?.tags ?? [],
    audioAssetId: context.master.id,
    thumbnailAssetId: context.coverArt.id,
    privacyStatus: "private" as const,
    madeForKids: false
  };

  return {
    payload,
    payloadHash: hashPayload(payload),
    uploadPerformed: false
  };
}
