# Album Edition Working State

This directory tracks the machine-readable and human-readable state of **BLAIZE SUNDAY — LOOKS EXPENSIVE, FEELS WEIRD — Archive Remaster / Derived Production Edition**.

## Tracked in Git

- edition metadata and tracklist
- source/evidence state
- source-selection receipts
- explicit mastering profiles
- QC and implementation receipts
- approval packets
- rights/credits verification state
- future native-stem replacement map

## Not tracked in Git

Binary source audio and generated media are intentionally excluded from source control. Local source paths live under ignored `album/local-inputs/`; rendered album media lives under ignored `artifacts/album-build/` and is transferred through the project asset library instead.

## Technical truth

A WAV or FLAC produced from a completed lossy or previously processed mix can be a lossless delivery encoding of the new derived result, but it is not a restoration of information discarded before the source reached this workflow. Source-separated vocals and instrumentals remain `DERIVED_REPAIR_ONLY` and must never be represented as native dry stems or original studio masters.

## Release boundary

Repository completeness, technical QC, and campaign production do not authorize public release. Master selection, identity-critical artwork, rights/credits assertions, distribution, and publication remain Human Authority gates.
