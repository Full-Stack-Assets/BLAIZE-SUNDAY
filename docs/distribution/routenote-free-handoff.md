# RouteNote Free Distribution Handoff

**Status:** ACTIVE IMPLEMENTATION TARGET  
**Evidence date:** 2026-08-25  
**Provider:** RouteNote Free  
**Execution boundary:** SongForge prepares and validates the package; the final distributor submission remains a manual RouteNote iOS action.

## Decision

Use **RouteNote Free** as the zero-upfront-cost distribution target for the current BLAIZE SUNDAY / SongForge release path.

Do not treat LabelGrid as the active provider for this operating profile. It requires paid access and is not usable as the required zero-cost, platform-compatible path.

This decision extends the existing provider-neutral release factory. It does **not** create a second distribution subsystem and does **not** weaken the existing public-release authorization gate.

## Truthful lifecycle

The persisted release states remain unchanged. RouteNote validation and the manual iOS handoff are evidence-bearing steps inside the existing state transitions, not invented release states.

```text
PREPARED
  -> [RouteNote package validation]
  -> AWAITING_AUTHORIZATION
  -> [matching approval + manual RouteNote iOS handoff required; no state advance yet]
  -> [RouteNote terms accepted + Distribute Free performed by Human Authority]
  -> [external RouteNote confirmation captured]
  -> SUBMITTED
  -> ACCEPTED
  -> SCHEDULED
  -> LIVE only after verified platform evidence
```

An approval inside SongForge authorizes the prepared payload. It is not evidence that RouteNote received anything.

`recordExternalSubmission` must receive a real external confirmation identifier before the release can transition to `SUBMITTED`.

## RouteNote Free package contract

The RouteNote-specific adapter must fail closed unless the generic DSP package is complete and the following provider requirements are proven.

### Audio

- Stereo.
- FLAC or MP3.
- 44.1 kHz sample rate.
- 16-bit.
- At least 320 kbps where bitrate metadata applies.

### Artwork

- JPEG.
- Exactly 3000 x 3000 pixels.
- RGB color space.
- No more than 25 MB.

### Metadata

- Release title and primary artist.
- Genre and language.
- Credits.
- Label name. If there is no separate label, use the artist name rather than values such as `Unsigned` or `Independent`.
- C-line and P-line.
- Writer names with first and last names and composer/lyricist roles.
- A valid Original Release Date in `YYYY-MM-DD` format.
- A valid Sales Start Date in `YYYY-MM-DD` format.
- Original Release Date must be on or before Sales Start Date.
- An explicit AI-assisted classification. Unknown is not silently treated as `false`.
- If AI-assisted, one or more source-site URLs must be preserved as internal provenance.

### Identifiers

If a UPC has not already been assigned, the handoff package requests RouteNote-generated UPC assignment instead of inventing one locally.

## Canonical persistence contract

RouteNote-specific preparation evidence is stored inside the existing provider-neutral `ReleaseMetadata.dspMetadata` JSON field. No RouteNote-only database or schema fork is introduced.

```json
{
  "routenote": {
    "labelName": "ARTIST OR LABEL NAME",
    "cLine": "COMPOSITION RIGHTSHOLDER",
    "pLine": "SOUND RECORDING RIGHTSHOLDER",
    "writers": [
      {
        "firstName": "FIRST",
        "lastName": "LAST",
        "role": "composer"
      }
    ],
    "originalReleaseDate": "YYYY-MM-DD",
    "salesStartDate": "YYYY-MM-DD",
    "aiAssisted": true,
    "aiSourceUrls": ["https://provider.example/source"],
    "audio": {
      "channels": 2,
      "bitrateKbps": 320
    },
    "artwork": {
      "fileSizeBytes": 5000000,
      "colorSpace": "RGB"
    }
  }
}
```

`AudioAsset.sampleRate` and `AudioAsset.bitDepth` remain the authoritative persisted technical fields for those properties. The RouteNote reconstruction layer performs strict type checks and does not coerce malformed provider metadata into apparently valid evidence.

## RouteNote iOS form mapping

A validated handoff package carries a deterministic `routeNoteForm` projection so the final iOS entry does not require reinterpreting canonical metadata:

- **Release Data:** generated-free UPC request and release title.
- **Album Details:** language, primary artist, primary/secondary genre, C-line, P-line, record label name, Original Release Date, Sales Start Date, and explicit flag.
- **Publishing Details:** writer first name, last name, and composer/lyricist role.
- **Manage Stores:** Spotify, Apple Music, and YouTube Music as the requested core DSP set; worldwide territory mode unless a later rights/territory decision overrides it before authorization.

The projection is part of the payload hash, so changes require a new matching approval.

## AI-assisted release policy

When the release is marked AI-assisted, the handoff package:

- preserves AI-source URLs as internal evidence, not release metadata;
- keeps AI provider/company names out of release metadata;
- excludes Amazon Music;
- excludes Content Recognition DSP options;
- excludes the Korean partners currently identified by RouteNote as Melon, Genie, Bugs, Flo, and Vibe;
- marks additional moderation as possible.

The implementation must not imitate or falsely imply association with a specific real-world artist.

## iOS handoff

The generated action package uses:

```json
{
  "provider": "routenote-free",
  "distributionPlan": "FREE",
  "handoff": {
    "mode": "MANUAL_IOS_REQUIRED",
    "submissionSupported": false,
    "finalAction": "DISTRIBUTE_FREE",
    "termsAcceptanceRequired": true
  }
}
```

This runtime has no connected RouteNote submission integration. The RouteNote iOS app is therefore the provider boundary for the final submission action.

## Current application boundary

The current web release endpoints explicitly run in Lab mode and return `LAB_RELEASE_SERVICE_UNAVAILABLE` for server-side release detail and distribution preparation. This implementation does not disguise that boundary by adding a cosmetic submit control to an unavailable server service.

The reusable release package, validation logic, persistence reconstruction, deterministic hashing, authorization binding, and external-receipt state machine remain the canonical implementation path. A future server release-service activation can reuse them without changing the RouteNote contract.

## Verification and receipts

The release must never be marked `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE` from an internal model assertion.

Required evidence progression:

1. Deterministic RouteNote package and hash.
2. Matching unexpired Human Authority approval.
3. External RouteNote confirmation for `SUBMITTED`.
4. Provider evidence for acceptance/scheduling.
5. Verified HTTPS DSP/platform URL plus external confirmation for `LIVE`.

## Official provider references

- RouteNote release creation: https://support.routenote.com/kb-article/how-do-i-create-a-release-on-routenote/
- RouteNote audio requirements: https://support.routenote.com/kb-article/what-are-the-audio-file-requirements/
- RouteNote artwork requirements: https://support.routenote.com/kb-article/what-are-the-album-artwork-requirements/
- RouteNote record-label field: https://support.routenote.com/kb-article/what-is-the-record-label-name-field-for-and-how-do-i-format-it/
- RouteNote publishing details: https://support.routenote.com/kb-article/whats-the-publishing-details-section-on-my-release-page/
- RouteNote AI-release policy: https://support.routenote.com/kb-article/can-i-upload-ai-releases/
- RouteNote AI metadata guidance: https://support.routenote.com/kb-article/how-should-i-format-a-release-containing-ai-generated-music/

## Current boundary

This capability makes a release **RouteNote-handoff-ready when all asset, rights, metadata, technical, persistence, and approval gates pass**. It does not by itself prove that the current BLAIZE SUNDAY single is release-ready, submitted, accepted, scheduled, or live.
