import { hashPayload } from "@songforge/shared";

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
    channels?: number;
    sampleRateHz?: number;
    bitDepth?: number;
    bitrateKbps?: number;
  } | null;
  coverArt: {
    id: string;
    fileUrl: string;
    sha256: string;
    approved: boolean;
    width: number;
    height: number;
    contentType: string;
    fileSizeBytes?: number;
    colorSpace?: string;
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
    labelName?: string;
    cLine?: string;
    pLine?: string;
    writers?: Array<{
      firstName: string;
      lastName: string;
      role: "composer" | "lyricist";
    }>;
    originalReleaseDate?: string;
    salesStartDate?: string;
    aiAssisted?: boolean;
    aiSourceUrls?: string[];
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

export type RouteNoteRequirement =
  | "ROUTENOTE_AUDIO_FORMAT"
  | "ROUTENOTE_AUDIO_TECHNICAL"
  | "ROUTENOTE_ARTWORK_FORMAT"
  | "ROUTENOTE_ARTWORK_DIMENSIONS"
  | "ROUTENOTE_ARTWORK_FILE_SIZE"
  | "ROUTENOTE_ARTWORK_COLOR_SPACE"
  | "ROUTENOTE_REQUIRED_METADATA"
  | "ROUTENOTE_ORIGINAL_RELEASE_DATE"
  | "ROUTENOTE_SALES_START_DATE"
  | "ROUTENOTE_RELEASE_DATE_ORDER"
  | "ROUTENOTE_AI_CLASSIFICATION"
  | "ROUTENOTE_AI_PROVENANCE";

export type ReleaseRequirement = DspRequirement | RouteNoteRequirement;

export interface DspChecklist {
  readyForAuthorization: boolean;
  missingRequirements: DspRequirement[];
  checks: Record<DspRequirement, boolean>;
}

export interface RouteNoteChecklist {
  readyForAuthorization: boolean;
  missingRequirements: ReleaseRequirement[];
  baseChecklist: DspChecklist;
  checks: Record<RouteNoteRequirement, boolean>;
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

function hasRouteNoteMetadata(context: ReleasePreparationContext): boolean {
  const metadata = context.metadata;
  const writers = metadata?.writers ?? [];

  return Boolean(
    metadata?.labelName?.trim() &&
      metadata.cLine?.trim() &&
      metadata.pLine?.trim() &&
      writers.length > 0 &&
      writers.every(
        writer =>
          writer.firstName.trim() &&
          writer.lastName.trim() &&
          (writer.role === "composer" || writer.role === "lyricist")
      )
  );
}

function isValidIsoDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function hasValidReleaseDateOrder(
  originalReleaseDate: string | undefined,
  salesStartDate: string | undefined
): boolean {
  if (!isValidIsoDate(originalReleaseDate) || !isValidIsoDate(salesStartDate)) {
    return false;
  }

  return originalReleaseDate! <= salesStartDate!;
}

function hasValidRouteNoteAiProvenance(
  context: ReleasePreparationContext
): boolean {
  const metadata = context.metadata;
  if (typeof metadata?.aiAssisted !== "boolean") return false;
  if (!metadata.aiAssisted) return true;

  const sourceUrls = metadata.aiSourceUrls ?? [];
  return (
    sourceUrls.length > 0 &&
    sourceUrls.every(sourceUrl => {
      try {
        const parsed = new URL(sourceUrl);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    })
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

export function buildRouteNoteChecklist(
  context: ReleasePreparationContext
): RouteNoteChecklist {
  const baseChecklist = buildDspChecklist(context);
  const masterContentType = context.master?.contentType.toLowerCase() ?? "";
  const coverContentType = context.coverArt?.contentType.toLowerCase() ?? "";

  const checks: Record<RouteNoteRequirement, boolean> = {
    ROUTENOTE_AUDIO_FORMAT:
      masterContentType === "audio/flac" ||
      masterContentType === "audio/mpeg" ||
      masterContentType === "audio/mp3",
    ROUTENOTE_AUDIO_TECHNICAL: Boolean(
      context.master &&
        context.master.channels === 2 &&
        context.master.sampleRateHz === 44_100 &&
        context.master.bitDepth === 16 &&
        typeof context.master.bitrateKbps === "number" &&
        context.master.bitrateKbps >= 320
    ),
    ROUTENOTE_ARTWORK_FORMAT:
      coverContentType === "image/jpeg" || coverContentType === "image/jpg",
    ROUTENOTE_ARTWORK_DIMENSIONS: Boolean(
      context.coverArt &&
        context.coverArt.width === 3000 &&
        context.coverArt.height === 3000
    ),
    ROUTENOTE_ARTWORK_FILE_SIZE: Boolean(
      context.coverArt &&
        typeof context.coverArt.fileSizeBytes === "number" &&
        context.coverArt.fileSizeBytes > 0 &&
        context.coverArt.fileSizeBytes <= 25 * 1024 * 1024
    ),
    ROUTENOTE_ARTWORK_COLOR_SPACE:
      context.coverArt?.colorSpace?.trim().toUpperCase() === "RGB",
    ROUTENOTE_REQUIRED_METADATA: hasRouteNoteMetadata(context),
    ROUTENOTE_ORIGINAL_RELEASE_DATE: isValidIsoDate(
      context.metadata?.originalReleaseDate
    ),
    ROUTENOTE_SALES_START_DATE: isValidIsoDate(context.metadata?.salesStartDate),
    ROUTENOTE_RELEASE_DATE_ORDER: hasValidReleaseDateOrder(
      context.metadata?.originalReleaseDate,
      context.metadata?.salesStartDate
    ),
    ROUTENOTE_AI_CLASSIFICATION:
      typeof context.metadata?.aiAssisted === "boolean",
    ROUTENOTE_AI_PROVENANCE: hasValidRouteNoteAiProvenance(context)
  };

  const routeNoteMissing = (
    Object.entries(checks) as [RouteNoteRequirement, boolean][]
  )
    .filter(([, passed]) => !passed)
    .map(([requirement]) => requirement);
  const missingRequirements: ReleaseRequirement[] = [
    ...baseChecklist.missingRequirements,
    ...routeNoteMissing
  ];

  return {
    readyForAuthorization: missingRequirements.length === 0,
    missingRequirements,
    baseChecklist,
    checks
  };
}

export class ReleasePayloadError extends Error {
  readonly code: string;
  readonly missingRequirements: ReleaseRequirement[];

  constructor(
    code: string,
    missingRequirements: ReleaseRequirement[] = []
  ) {
    super(code);
    this.name = "ReleasePayloadError";
    this.code = code;
    this.missingRequirements = missingRequirements;
  }
}

function isRouteNoteFree(provider: string): boolean {
  return provider.trim().toLowerCase() === "routenote-free";
}

function buildRouteNotePayload(context: ReleasePreparationContext) {
  const checklist = buildRouteNoteChecklist(context);
  if (!checklist.readyForAuthorization) {
    throw new ReleasePayloadError(
      "ROUTENOTE_PACKAGE_INCOMPLETE",
      checklist.missingRequirements
    );
  }

  if (context.status !== "PREPARED") {
    throw new ReleasePayloadError("RELEASE_NOT_PREPARED");
  }

  const metadata = context.metadata!;
  const aiAssisted = metadata.aiAssisted === true;
  const aiSourceUrls = metadata.aiSourceUrls ?? [];
  const requestedStores = ["SPOTIFY", "APPLE_MUSIC", "YOUTUBE_MUSIC"];
  const excludedStores = aiAssisted
    ? [
        "AMAZON_MUSIC",
        "CONTENT_RECOGNITION",
        "MELON",
        "GENIE",
        "BUGS",
        "FLO",
        "VIBE"
      ]
    : [];
  const {
    aiAssisted: _aiAssisted,
    aiSourceUrls: _aiSourceUrls,
    ...releaseMetadata
  } = metadata;

  const payload = {
    provider: "routenote-free",
    releaseId: context.releaseId,
    projectId: context.projectId,
    releaseType: "SINGLE",
    distributionPlan: "FREE" as const,
    artistName: context.artistName,
    title: context.title,
    master: context.master,
    coverArt: context.coverArt,
    metadata: releaseMetadata,
    rights: context.rights,
    identifiers: {
      upc: {
        mode: "ROUTENOTE_GENERATED" as const,
        value: null
      }
    },
    routeNoteForm: {
      releaseData: {
        upc: "GENERATE_FREE" as const,
        releaseTitle: context.title
      },
      albumDetails: {
        language: metadata.language,
        primaryArtist: context.artistName,
        primaryGenre: metadata.genre,
        secondaryGenre: metadata.subgenre,
        compositionCopyright: metadata.cLine!,
        soundRecordingCopyright: metadata.pLine!,
        recordLabelName: metadata.labelName!,
        originalReleaseDate: metadata.originalReleaseDate!,
        salesStartDate: metadata.salesStartDate!,
        explicit: metadata.explicit
      },
      publishingDetails: metadata.writers!,
      manageStores: {
        requested: requestedStores,
        territoryMode: "WORLDWIDE" as const
      }
    },
    storePolicy: {
      requested: requestedStores,
      excluded: excludedStores
    },
    aiPolicy: {
      aiAssisted,
      sourceUrls: aiSourceUrls,
      keepProviderNamesOutOfReleaseMetadata: true,
      additionalModerationPossible: aiAssisted
    },
    handoff: {
      mode: "BROWSER_AUTOMATION" as const,
      createReleaseSupported: true,
      metadataUploadSupported: true,
      audioUploadSupported: true,
      artworkUploadSupported: true,
      storeConfigurationSupported: true,
      draftCompletionSupported: true,
      finalSubmission: "HUMAN_AUTHORIZED" as const,
      finalAction: "DISTRIBUTE_FREE" as const,
      termsAcceptanceRequired: true
    }
  };

  return {
    payload,
    payloadHash: hashPayload(payload),
    checklist,
    nextStatus: "AWAITING_AUTHORIZATION" as const,
    submissionPerformed: false
  };
}

export function buildDistributionPayload(
  context: ReleasePreparationContext,
  provider: string
) {
  if (isRouteNoteFree(provider)) {
    return buildRouteNotePayload(context);
  }

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
