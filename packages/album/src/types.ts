export type CanonAssetState =
  | "CANONICAL"
  | "APPROVED_PRODUCTION_ASSET"
  | "CANDIDATE"
  | "EXPERIMENT"
  | "SUPERSEDED"
  | "REJECTED"
  | "DERIVED_REPAIR_ONLY";

export type CatalogState = "CURATED_REFERENCE_MASTER" | "NATIVE_STEM_MASTER";
export type EvidenceState =
  "VERIFIED" | "UNVERIFIED" | "UNKNOWN" | "CONFLICTING" | "BLOCKED_SOURCE_MISSING";
export type SongLifecycleStatus =
  "CONCEPT" | "WRITING" | "DEMO" | "SELECTED" | "QA" | "RELEASE_READY" | "PUBLISHED" | "ARCHIVED";
export type ManifestPresence =
  "present_verified" | "present_needs_human_approval" | "blocked_source_missing" | "not_applicable";

export interface AlbumAssetRecord {
  assetId: string;
  trackId: string;
  filename: string;
  canonAssetState: CanonAssetState;
  catalogState: CatalogState;
  evidenceState: EvidenceState;
  presence: ManifestPresence;
  nativeStem: boolean;
  canonical: boolean;
  sha256?: string;
  parentAssets?: string[];
  limitationNotice?: string;
}

export interface TrackRecord {
  id: string;
  title: string;
  visualMode: string;
  signatureSound: string;
  evidenceState: EvidenceState;
  lifecycleStatus: SongLifecycleStatus;
  deliverables: AlbumAssetRecord[];
}

export interface SourceStateRecord {
  evidence_state: EvidenceState;
  documented_render_evidence?: boolean;
}

export interface AlbumManifest {
  artist: "BLAIZE SUNDAY";
  title: "LOOKS EXPENSIVE, FEELS WEIRD";
  edition: "Archive Remaster / Derived Production Edition";
  catalogState: "CURATED_REFERENCE_MASTER";
  releaseAuthorized: false;
  tracks: TrackRecord[];
}

export interface ProvenanceReceipt {
  assetId: string;
  trackId: string;
  filename: string;
  canonAssetState: CanonAssetState;
  catalogState: CatalogState;
  evidenceState: EvidenceState;
  parentAssets: string[];
  sha256: string;
  sourceSha256: string | null;
  sourceType: string;
  derivationMethod: string;
  nativeStem: boolean;
  canonical: boolean;
  limitationNotice: string;
  createdAt: string;
}

export function assertValidStateCombination(asset: AlbumAssetRecord): void {
  if (
    asset.canonAssetState === "DERIVED_REPAIR_ONLY" &&
    asset.catalogState === "NATIVE_STEM_MASTER"
  ) {
    throw new Error("DERIVED_REPAIR_ONLY assets cannot claim NATIVE_STEM_MASTER catalog state");
  }
  if (asset.nativeStem === false && asset.canonical === true) {
    throw new Error("non-native assets cannot be marked canonical");
  }
}
