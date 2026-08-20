import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidStateCombination,
  type AlbumAssetRecord,
} from "./types.ts";

test("derived repair assets cannot claim native-stem catalog state", () => {
  const asset: AlbumAssetRecord = {
    assetId: "01-vocal-derived",
    trackId: "01_LOOKS_EXPENSIVE",
    filename: "01_LOOKS_EXPENSIVE_INSTRUMENTAL_DERIVED.wav",
    canonAssetState: "DERIVED_REPAIR_ONLY",
    catalogState: "NATIVE_STEM_MASTER",
    evidenceState: "VERIFIED",
    presence: "present_verified",
    nativeStem: false,
    canonical: false,
  };

  assert.throws(() => assertValidStateCombination(asset), /DERIVED_REPAIR_ONLY/);
});

test("non-native assets cannot be marked canonical", () => {
  const asset: AlbumAssetRecord = {
    assetId: "01-master-derived",
    trackId: "01_LOOKS_EXPENSIVE",
    filename: "01_LOOKS_EXPENSIVE_ARCHIVE_MASTER_24-48.wav",
    canonAssetState: "CANDIDATE",
    catalogState: "CURATED_REFERENCE_MASTER",
    evidenceState: "VERIFIED",
    presence: "present_verified",
    nativeStem: false,
    canonical: true,
  };

  assert.throws(() => assertValidStateCombination(asset), /non-native/);
});
