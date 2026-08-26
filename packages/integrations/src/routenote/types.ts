export type RouteNoteErrorCode =
  | "ROUTENOTE_SESSION_REQUIRED"
  | "ROUTENOTE_UI_CONTRACT_CHANGED"
  | "ROUTENOTE_DRAFT_CREATE_FAILED"
  | "ROUTENOTE_DUPLICATE_DRAFT_AMBIGUOUS"
  | "ROUTENOTE_AUDIO_UPLOAD_FAILED"
  | "ROUTENOTE_AUDIO_CONFIRMATION_MISSING"
  | "ROUTENOTE_ARTWORK_UPLOAD_FAILED"
  | "ROUTENOTE_ARTWORK_CONFIRMATION_MISSING"
  | "ROUTENOTE_METADATA_REJECTED"
  | "ROUTENOTE_STORE_POLICY_MISMATCH"
  | "ROUTENOTE_PROVIDER_VALIDATION_FAILED";

export class RouteNoteBrowserError extends Error {
  readonly code: RouteNoteErrorCode;

  constructor(code: RouteNoteErrorCode, message = code) {
    super(message);
    this.name = "RouteNoteBrowserError";
    this.code = code;
  }
}

export type RouteNoteWriterRole = "composer" | "lyricist";

export interface RouteNoteWriter {
  firstName: string;
  lastName: string;
  role: RouteNoteWriterRole;
}

export interface RouteNoteTrackInput {
  trackIndex: number;
  path: string;
  sha256: string;
  title: string;
  artistName: string;
  language: string;
  explicit: boolean;
  writers: RouteNoteWriter[];
  isrc?: string;
}

export interface RouteNoteDistributionPayload {
  provider: "routenote-free";
  releaseId: string;
  artistName: string;
  title: string;
  routeNoteForm: {
    releaseData: {
      upc: "GENERATE_FREE" | string;
      releaseTitle: string;
    };
    albumDetails: {
      language: string;
      primaryArtist: string;
      primaryGenre: string;
      secondaryGenre: string;
      compositionCopyright: string;
      soundRecordingCopyright: string;
      recordLabelName: string;
      originalReleaseDate: string;
      salesStartDate: string;
      explicit: boolean;
    };
    publishingDetails: RouteNoteWriter[];
    manageStores: {
      requested: string[];
      territoryMode: "WORLDWIDE";
    };
  };
  storePolicy: {
    requested: string[];
    excluded: string[];
  };
  handoff: {
    mode: "BROWSER_AUTOMATION";
  } & Record<string, unknown>;
}

export interface RouteNoteBrowserJob {
  payload: RouteNoteDistributionPayload;
  payloadHash: string;
  assets: {
    audio: RouteNoteTrackInput[];
    artwork: {
      path: string;
      sha256: string;
    };
  };
}

export type RouteNoteExecutionStep =
  | "SESSION_VERIFIED"
  | "DRAFT_RESOLVED"
  | "RELEASE_DATA_SAVED"
  | "ALBUM_DETAILS_SAVED"
  | "AUDIO_UPLOADED"
  | "ARTWORK_UPLOADED"
  | "STORES_CONFIGURED"
  | "PROVIDER_VALIDATED";

export interface RouteNoteTrackReceipt {
  trackIndex: number;
  title: string;
  uploaded: boolean;
}

export interface RouteNoteExecutionReceipt {
  releaseId: string;
  payloadHash: string;
  routeNoteReleaseId?: string;
  routeNoteReleaseUrl?: string;
  startedAt: string;
  finishedAt: string;
  completedSteps: RouteNoteExecutionStep[];
  tracks: RouteNoteTrackReceipt[];
  artworkUploaded: boolean;
  storesConfigured: boolean;
  outcome: "DRAFT_READY";
}
