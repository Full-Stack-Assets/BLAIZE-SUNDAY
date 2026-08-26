# RouteNote Free Browser Draft Automation

**Status:** IMPLEMENTED IN PR #23; LIVE ROUTENOTE UI VERIFICATION STILL REQUIRED  
**Evidence date:** 2026-08-25  
**Provider:** RouteNote Free  
**Execution boundary:** SongForge validates the immutable release payload; a host runtime supplies an already-authenticated Playwright-compatible RouteNote page; the adapter creates or resumes the RouteNote draft, enters metadata, uploads audio and artwork, and configures stores. It does not perform final distribution.

## Decision

Use **RouteNote Free** as the zero-upfront-cost distribution target for the current BLAIZE SUNDAY / SongForge release path.

LabelGrid is not the active provider for this operating profile because paid access makes it unsuitable for the required zero-upfront-cost path.

The RouteNote implementation extends the existing provider-neutral release factory. It does not create a second canonical release system and does not weaken SongForge's existing rights, provenance, payload-hash, approval, or external-receipt gates.

## What is automated

Given a RouteNote-ready SongForge payload plus local paths for the approved audio and artwork assets, the browser workflow can:

1. verify that the supplied browser page is already authenticated;
2. navigate to RouteNote Distribution;
3. resolve an existing matching draft or create a new release draft;
4. leave UPC blank when the canonical payload requests RouteNote-generated UPC assignment;
5. enter canonical album metadata;
6. upload tracks in canonical `trackIndex` order;
7. split audio uploads into batches of at most 15 files;
8. require provider-visible confirmation for every uploaded track;
9. enter per-track title, artist, language, explicit flag, optional ISRC, and writer roles;
10. upload artwork and require a provider-visible artwork confirmation;
11. enable requested stores and explicitly disable stores excluded by policy;
12. preserve worldwide territory mode without inventing territory restrictions;
13. surface RouteNote validation errors as stable execution failures; and
14. return an evidence-bearing `DRAFT_READY` receipt.

The workflow contains no `Distribute Free` action and cannot return `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE`.

## Host boundary

The integrations package does not launch a browser and does not store RouteNote credentials, cookies, or storage state. The host runtime owns authentication and supplies an already-created Page-compatible object.

The adapter entrypoints are:

```ts
import {
  createRouteNotePlaywrightPort,
  executeRouteNoteWorkflow
} from "@songforge/integrations";

const port = createRouteNotePlaywrightPort(authenticatedRouteNotePage);
const receipt = await executeRouteNoteWorkflow(job, port);
```

`authenticatedRouteNotePage` is intentionally supplied by the host. If the page exposes RouteNote's Login surface, the workflow fails with `ROUTENOTE_SESSION_REQUIRED` rather than attempting to bypass authentication controls.

`ROUTENOTE_BROWSER_HOST_ENABLED=1` is only a non-secret health/configuration hint. It changes the integration projection from `UNCONFIGURED` to `UNAUTHORIZED`; it never produces `CONNECTED`. A host that performs a current authenticated-session check must own any stronger runtime health assertion.

## Truthful lifecycle

Browser draft completion is not distributor submission.

```text
PREPARED
  -> [RouteNote package validation + deterministic payload hash]
  -> [browser create/resume + metadata/audio/artwork/store preparation]
  -> DRAFT_READY receipt
  -> AWAITING_AUTHORIZATION / existing release-policy gate
  -> [separate authorized final RouteNote distribution action]
  -> [real external RouteNote submission confirmation]
  -> SUBMITTED
  -> ACCEPTED
  -> SCHEDULED
  -> LIVE only after verified platform evidence
```

A `DRAFT_READY` receipt proves only that the browser workflow completed the configured draft-preparation steps against the provider page it was given. It does not prove that RouteNote accepted, scheduled, or distributed the release.

`recordExternalSubmission` must still receive a real external confirmation identifier before the canonical release can transition to `SUBMITTED`.

## RouteNote Free package contract

The RouteNote-specific preparation layer fails closed unless the generic DSP package is complete and the following provider requirements are proven.

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
- Writer first and last names with composer/lyricist roles.
- Original Release Date in `YYYY-MM-DD` format.
- Sales Start Date in `YYYY-MM-DD` format.
- Original Release Date on or before Sales Start Date.
- Explicit AI-assisted classification; unknown is not silently treated as `false`.
- For AI-assisted releases, one or more source-site URLs preserved as internal provenance.

### Identifiers

If a UPC has not already been assigned, the payload requests RouteNote-generated UPC assignment instead of inventing one locally. The browser workflow therefore leaves the UPC field empty in that mode.

## Canonical persistence contract

RouteNote-specific preparation evidence remains in the provider-neutral `ReleaseMetadata.dspMetadata` JSON field. No RouteNote-only canonical database or release state machine is introduced.

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

`AudioAsset.sampleRate` and `AudioAsset.bitDepth` remain authoritative for those technical properties. The RouteNote reconstruction layer uses strict type checks and does not coerce malformed provider metadata into apparently valid evidence.

## Deterministic RouteNote form projection

The validated payload carries a `routeNoteForm` projection so browser execution does not reinterpret canonical metadata:

- **Release Data:** generated-free UPC request and release title.
- **Album Details:** language, primary artist, primary/secondary genre, C-line, P-line, record label name, Original Release Date, Sales Start Date, and explicit flag.
- **Publishing / track details:** writer first name, last name, and composer/lyricist role together with the canonical per-track fields supplied to the browser job.
- **Manage Stores:** Spotify, Apple Music, and YouTube Music as the requested core DSP set; worldwide territory mode unless a later rights/territory decision changes the canonical payload.

The projection remains part of the payload hash. A changed payload is a different release instruction and must not inherit evidence or authorization from an earlier hash.

## AI-assisted release policy

When a release is marked AI-assisted, the package:

- preserves AI-source URLs as internal evidence, not release metadata;
- keeps AI provider/company names out of release metadata;
- excludes Amazon Music;
- excludes Content Recognition options;
- excludes the Korean partners currently identified by RouteNote as Melon, Genie, Bugs, Flo, and Vibe; and
- records that additional moderation may occur.

The browser workflow applies the requested and excluded store policy rather than silently selecting every store.

## Browser handoff contract

The generated payload now advertises browser draft automation:

```json
{
  "provider": "routenote-free",
  "distributionPlan": "FREE",
  "handoff": {
    "mode": "BROWSER_AUTOMATION",
    "createReleaseSupported": true,
    "metadataUploadSupported": true,
    "audioUploadSupported": true,
    "artworkUploadSupported": true,
    "storeConfigurationSupported": true,
    "draftCompletionSupported": true,
    "finalSubmission": "HUMAN_AUTHORIZED",
    "finalAction": "DISTRIBUTE_FREE",
    "termsAcceptanceRequired": true
  }
}
```

`finalAction` describes the provider's eventual external action. It is not implemented by `executeRouteNoteWorkflow`; the current workflow stops at draft preparation.

## Failure and recovery rules

The browser workflow uses centralized semantic locator candidates rather than scattering raw selectors across the release logic. If RouteNote changes its page contract so that no candidate can be resolved, the adapter fails with `ROUTENOTE_UI_CONTRACT_CHANGED` instead of guessing.

Other stable failures include:

- `ROUTENOTE_SESSION_REQUIRED`
- `ROUTENOTE_DUPLICATE_DRAFT_AMBIGUOUS`
- `ROUTENOTE_AUDIO_CONFIRMATION_MISSING`
- `ROUTENOTE_ARTWORK_CONFIRMATION_MISSING`
- `ROUTENOTE_METADATA_REJECTED`
- `ROUTENOTE_STORE_POLICY_MISMATCH`
- `ROUTENOTE_PROVIDER_VALIDATION_FAILED`

The draft resolver fails closed when more than one existing release matches the canonical title, avoiding an automatic duplicate-create decision under ambiguity.

## Security and evidence

Do not commit or persist RouteNote passwords, cookies, browser storage state, private screenshots, uploaded media, or account data in this repository.

Ordinary CI uses fake browser/page objects only. It does not authenticate to RouteNote, create releases, upload media, change stores, accept provider agreements, or submit music.

The first live run must use an authorized authenticated RouteNote browser session and verify the current provider DOM/labels. Until that run succeeds, the adapter is implementation-verified but the current live RouteNote UI contract remains unverified.

## Verification and receipts

A successful draft receipt records:

- canonical release ID;
- immutable payload hash;
- provider URL and provider release ID when derivable;
- ordered completed steps;
- per-track upload receipts;
- artwork/store completion; and
- `DRAFT_READY` outcome.

The release must never be marked `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE` from an internal model assertion or from draft completion.

Required later evidence progression remains:

1. deterministic RouteNote package and hash;
2. browser `DRAFT_READY` receipt;
3. separately authorized final distribution action;
4. external RouteNote confirmation for `SUBMITTED`;
5. provider evidence for acceptance/scheduling; and
6. verified HTTPS DSP/platform URL plus external confirmation for `LIVE`.

## Official provider references

- RouteNote release creation: https://support.routenote.com/kb-article/how-do-i-create-a-release-on-routenote/
- RouteNote audio requirements: https://support.routenote.com/kb-article/what-are-the-audio-file-requirements/
- RouteNote artwork requirements: https://support.routenote.com/kb-article/what-are-the-album-artwork-requirements/
- RouteNote record-label field: https://support.routenote.com/kb-article/what-is-the-record-label-name-field-for-and-how-do-i-format-it/
- RouteNote publishing details: https://support.routenote.com/kb-article/whats-the-publishing-details-section-on-my-release-page/
- RouteNote AI-release policy: https://support.routenote.com/kb-article/can-i-upload-ai-releases/
- RouteNote AI metadata guidance: https://support.routenote.com/kb-article/how-should-i-format-a-release-containing-ai-generated-music/

## Current boundary

The implementation makes a validated SongForge release **browser-draft-automation-capable**. It does not claim that a real RouteNote account session has been exercised by CI, that the current RouteNote website selectors have been live-verified, or that any release has been submitted, accepted, scheduled, or published.