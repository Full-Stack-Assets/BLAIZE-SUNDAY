# RouteNote Browser Automation Design

**Status:** Approved direction, implementation specification  
**Date:** 2026-08-25  
**Repository:** `Full-Stack-Assets/BLAIZE-SUNDAY`  
**Product:** SongForge OS / BLAIZE SUNDAY  
**Provider:** RouteNote Free  
**Execution boundary:** Automate RouteNote release creation, metadata entry, audio upload, artwork upload, store/territory configuration, validation, and draft completion. Final RouteNote agreement acceptance and `Distribute Free` remain payload-bound approval actions.

## 1. Goal

Replace the current manual RouteNote iOS handoff with a browser-execution adapter that consumes SongForge's existing validated RouteNote payload and completes the RouteNote web release workflow automatically.

The user should provide release assets and metadata to SongForge once. SongForge should then be able to create the corresponding RouteNote release and upload/populate all supported data without requiring the user to manually re-enter the same information.

The implementation must not invent or reverse-engineer an undocumented RouteNote API. It uses browser automation against the normal RouteNote web application and preserves the existing evidence-first release state machine.

## 2. Existing Contract to Preserve

The current `packages/release/src/payloads.ts` implementation already owns the canonical RouteNote preparation contract. It validates:

- approved master and cover assets;
- audio format and technical properties;
- artwork format, size, color space, and exact 3000 x 3000 dimensions;
- complete release metadata;
- writer/composer metadata;
- valid release dates and date ordering;
- rights, ownership, provenance, and unresolved warning gates;
- explicit AI-assisted classification and AI-source provenance;
- generated-UPC intent;
- requested stores, territories, and AI-related store exclusions;
- deterministic payload hashing.

Those checks remain authoritative. The browser adapter must consume the resulting immutable RouteNote payload rather than duplicate or weaken the validation rules.

The browser adapter does not introduce new release lifecycle states. `PREPARED`, `AWAITING_AUTHORIZATION`, `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, and `LIVE` retain their current meanings.

## 3. Architecture Decision

Implement RouteNote automation inside `@songforge/integrations` as a provider adapter with an injected browser-page contract. Use Playwright as the production browser driver, but keep the RouteNote workflow logic testable without launching a browser.

The implementation has four layers:

1. **RouteNote execution contract**: stable input, output, progress, receipt, and failure types.
2. **RouteNote workflow driver**: deterministic steps that map `routeNoteForm` and assets into browser actions.
3. **Playwright runtime adapter**: creates/restores a browser session, supplies a page to the workflow driver, and captures evidence.
4. **SongForge execution entrypoint**: accepts a previously validated payload/hash and invokes the browser adapter without changing release state merely because form automation succeeded.

This preserves provider neutrality: the release package remains in `@songforge/release`; provider interaction remains in `@songforge/integrations`.

## 4. File Boundaries

Create focused RouteNote files under the existing integrations package:

```text
packages/integrations/src/routenote/
  types.ts            Stable input/output/error/receipt contracts
  browser-port.ts     Minimal page/browser interfaces used by the workflow
  selectors.ts        Central RouteNote locator definitions and fallbacks
  workflow.ts         Deterministic release-creation/upload workflow
  playwright.ts       Playwright-backed session and evidence adapter
  index.ts            Public RouteNote exports
  workflow.test.ts    Mock-page behavior and fail-closed tests
  selectors.test.ts   Locator contract tests where useful
```

Modify:

```text
packages/integrations/src/index.ts
packages/integrations/src/index.test.ts
packages/integrations/package.json
packages/release/src/payloads.ts
packages/release/src/payloads.test.ts
```

A later worker/API wiring change may invoke the public adapter, but the first implementation must leave browser execution independently callable and testable instead of tangling it into the current Lab-mode web endpoints.

## 5. Execution Input

The RouteNote browser runner consumes a validated RouteNote distribution payload plus local or materialized asset paths.

Conceptual contract:

```ts
export interface RouteNoteBrowserJob {
  payload: RouteNoteDistributionPayload;
  payloadHash: string;
  assets: {
    audio: Array<{
      trackIndex: number;
      path: string;
      sha256: string;
    }>;
    artwork: {
      path: string;
      sha256: string;
    };
  };
  mode: "PREPARE_DRAFT" | "SUBMIT_WITH_APPROVAL";
  approval?: {
    payloadHash: string;
    action: "ROUTENOTE_DISTRIBUTE_FREE";
    expiresAt: string;
  };
}
```

`PREPARE_DRAFT` is the default. `SUBMIT_WITH_APPROVAL` is allowed only when the approval hash exactly matches the job payload hash and the approval has not expired.

## 6. Browser Workflow

The workflow is deterministic and idempotency-aware.

### Step A: Authenticate or restore session

- Restore a persisted Playwright storage state when supplied.
- Navigate to the RouteNote distribution area.
- Detect unauthenticated/login state.
- If credentials are configured, perform login through the normal RouteNote login UI.
- If RouteNote presents MFA, CAPTCHA, unusual verification, or a material terms screen not represented in the execution contract, stop with a stable blocker code instead of bypassing it.

Session cookies/tokens are secrets. They must never be committed to the repository or written into normal logs.

### Step B: Resolve existing draft or create release

Before creating a new release, search the RouteNote account for an existing draft carrying the SongForge release identity when the UI exposes a reliable identifier.

If a matching draft is found, resume it. If no matching draft is proven, create a new release.

The workflow must not create a second release merely because a previous browser run timed out after RouteNote successfully created the first draft.

### Step C: Release data

Populate from `payload.routeNoteForm.releaseData`:

- release title;
- UPC behavior;
- request RouteNote-generated UPC when the canonical payload says `GENERATE_FREE`.

Do not invent a UPC locally.

### Step D: Album details

Populate:

- language;
- primary artist;
- primary genre;
- secondary genre when present;
- C-line/composition copyright;
- P-line/sound-recording copyright;
- record label name;
- original release date;
- sales start date;
- explicit designation.

Every value must come from the immutable prepared payload. Browser automation must not creatively rewrite metadata.

### Step E: Audio upload and track metadata

Upload every audio item in canonical track order.

For multi-track releases, split file selection into RouteNote-supported batches when required by the current UI. The workflow records each batch and every uploaded track separately.

After each upload, confirm the RouteNote UI reports a usable uploaded track before moving to metadata entry.

Populate per-track metadata from the canonical release package, including title, artist attribution, explicit designation, writers/roles, and ISRC behavior where supported by the prepared payload.

An upload is not considered successful merely because the file chooser accepted the local file.

### Step F: Artwork upload

Upload the prevalidated JPEG artwork.

Wait for RouteNote's UI to confirm the asset is accepted/attached. A local file chooser completion is not sufficient evidence.

### Step G: Stores and territories

Apply `storePolicy` and `routeNoteForm.manageStores`:

- include requested stores;
- exclude stores prohibited by the prepared AI policy;
- apply worldwide territory mode unless a future canonical rights decision changes it before payload hashing.

If the RouteNote UI exposes a store that cannot be mapped safely from the canonical provider enum, leave it unchanged only when that does not violate an explicit exclusion. Otherwise fail closed.

### Step H: Validate and save draft

Run through the RouteNote release sections and surface all provider validation errors.

A prepared draft result requires:

- release exists in RouteNote;
- all expected tracks are attached;
- artwork is attached;
- required metadata is populated;
- store/territory configuration matches the payload;
- no visible blocking RouteNote validation errors remain.

The runner then returns `DRAFT_READY` plus external identifiers/evidence. It does not mark the SongForge release `SUBMITTED`.

### Step I: Optional final submission

Only in `SUBMIT_WITH_APPROVAL` mode:

1. verify the supplied approval payload hash equals the immutable job payload hash;
2. verify approval action equals `ROUTENOTE_DISTRIBUTE_FREE`;
3. verify approval has not expired;
4. confirm the RouteNote UI is still showing the exact release expected by the job;
5. accept the RouteNote agreement only as part of this separately authorized execution;
6. invoke `Distribute Free`;
7. require a real RouteNote confirmation identifier or equivalent provider receipt before reporting external submission success.

If confirmation is ambiguous, return `SUBMISSION_UNCONFIRMED` and do not advance canonical state.

## 7. Selector Strategy

RouteNote UI structure can change, so selectors must be centralized.

Preferred locator order:

1. accessible role + visible label/name;
2. explicit form label association;
3. stable input name/id when proven;
4. narrowly scoped text fallback.

Do not spread brittle CSS/XPath selectors throughout workflow code.

Each important locator has an operation name and may have ordered fallbacks. If all supported locators fail, raise a stable `ROUTENOTE_UI_CONTRACT_CHANGED` error and capture evidence.

The adapter must never silently guess a different field when a selector stops matching.

## 8. Error Model

Use stable codes, including at minimum:

- `ROUTENOTE_SESSION_REQUIRED`
- `ROUTENOTE_AUTHENTICATION_FAILED`
- `ROUTENOTE_INTERACTIVE_VERIFICATION_REQUIRED`
- `ROUTENOTE_UI_CONTRACT_CHANGED`
- `ROUTENOTE_DRAFT_CREATE_FAILED`
- `ROUTENOTE_DUPLICATE_DRAFT_AMBIGUOUS`
- `ROUTENOTE_AUDIO_UPLOAD_FAILED`
- `ROUTENOTE_AUDIO_CONFIRMATION_MISSING`
- `ROUTENOTE_ARTWORK_UPLOAD_FAILED`
- `ROUTENOTE_ARTWORK_CONFIRMATION_MISSING`
- `ROUTENOTE_METADATA_REJECTED`
- `ROUTENOTE_STORE_POLICY_MISMATCH`
- `ROUTENOTE_PROVIDER_VALIDATION_FAILED`
- `ROUTENOTE_APPROVAL_REQUIRED`
- `ROUTENOTE_APPROVAL_MISMATCH`
- `ROUTENOTE_SUBMISSION_FAILED`
- `ROUTENOTE_SUBMISSION_UNCONFIRMED`

Retriable navigation/network errors may retry with a small bounded policy. Authentication failures, validation failures, selector-contract failures, approval failures, and ambiguous duplicate detection are non-retriable until corrected.

## 9. Receipts and Evidence

A browser run returns a structured receipt containing:

- SongForge release ID;
- payload hash;
- RouteNote release identifier when observable;
- RouteNote release URL when observable;
- execution mode;
- start/end timestamps;
- ordered completed steps;
- per-track upload results;
- artwork result;
- store/territory result;
- provider validation result;
- submission result when separately authorized;
- screenshots or trace artifact references for failed/high-value checkpoints;
- final stable outcome code.

Credentials, cookies, local storage tokens, raw authorization headers, and passwords are excluded from receipts.

Browser screenshots must be treated as potentially sensitive account evidence and stored in the configured private evidence location, not committed to the public repository.

## 10. Idempotency and Resume

The runner is resumable at provider-step granularity.

- Re-running after a timeout must first determine whether the corresponding provider-side action already succeeded.
- Track uploads are reconciled by canonical track index/title plus available provider evidence.
- Existing artwork is reused when its expected release context is proven.
- Release creation is the highest-risk duplicate point and requires explicit draft-resolution logic before any create action.
- The adapter may repeat harmless navigation and reads, but must avoid duplicate external objects and duplicate final submission.

A previous execution receipt may be supplied as a resume hint, but provider-side evidence remains authoritative.

## 11. Security and Configuration

Supported runtime configuration may include:

```text
ROUTENOTE_USERNAME
ROUTENOTE_PASSWORD
ROUTENOTE_STORAGE_STATE_PATH
ROUTENOTE_BROWSER_EXECUTABLE_PATH
ROUTENOTE_HEADLESS
ROUTENOTE_EVIDENCE_DIR
```

Secrets are runtime configuration only. They are never committed.

Storage state is optional and preferred after initial authentication because it reduces repeated password entry. If the state expires, the adapter may fall back to credential login when configured.

The implementation must not attempt to bypass CAPTCHA, MFA, anti-bot controls, or account-security challenges.

## 12. Integration Health

`inspectIntegrations()` adds a RouteNote-specific report.

Expected capabilities:

```text
prepare_release
create_release
upload_audio
upload_artwork
configure_metadata
configure_stores
prepare_draft
```

`submit_release` is reported only when the runtime is capable of reaching the provider submission path; capability does not imply authorization.

Health must distinguish:

- `UNCONFIGURED`: no RouteNote browser/session configuration;
- `UNAUTHORIZED`: configuration exists but authentication has not been verified;
- `CONNECTED`: a current lightweight RouteNote session check proves authenticated access;
- `DEGRADED`: authenticated but a noncritical capability check fails;
- `FAILED`: browser/provider execution is unusable.

Presence of username/password alone never produces `CONNECTED`.

## 13. Release Payload Change

Update the RouteNote handoff projection from the current manual-only marker to a browser-capability description while preserving payload hashing.

Target shape:

```ts
handoff: {
  mode: "BROWSER_AUTOMATION",
  createReleaseSupported: true,
  metadataUploadSupported: true,
  audioUploadSupported: true,
  artworkUploadSupported: true,
  storeConfigurationSupported: true,
  draftCompletionSupported: true,
  finalSubmission: "HUMAN_AUTHORIZED",
  finalAction: "DISTRIBUTE_FREE",
  termsAcceptanceRequired: true
}
```

Because this object participates in the deterministic payload hash, existing approvals for the old manual-handoff payload cannot authorize the new browser-execution payload. A new matching approval is required when final submission is requested.

## 14. Testing Strategy

### Unit tests

Use a fake/in-memory browser port to prove:

- steps run in deterministic order;
- canonical payload values are entered without mutation;
- all tracks are uploaded in order;
- provider-confirmation checks are required;
- store exclusions are enforced;
- duplicate draft ambiguity fails closed;
- selector failure produces `ROUTENOTE_UI_CONTRACT_CHANGED`;
- `PREPARE_DRAFT` never invokes final submission;
- final submission requires exact, unexpired payload-bound approval;
- an ambiguous provider confirmation cannot become submitted success;
- receipts redact secret/session data.

### Payload tests

Update `packages/release/src/payloads.test.ts` to assert the new browser handoff projection and deterministic hash behavior.

### Integration smoke test

Add an opt-in live smoke harness that is skipped unless explicit RouteNote test configuration is present. It may authenticate and navigate/read provider state but must not create or submit a real release in default CI.

No production RouteNote writes occur in ordinary CI.

## 15. Acceptance Criteria

The feature is complete when:

1. a valid SongForge RouteNote payload can drive a browser workflow that creates or resumes a RouteNote release draft;
2. release metadata is entered from the immutable payload;
3. all expected audio tracks upload and receive provider-side confirmation;
4. artwork uploads and receives provider-side confirmation;
5. requested stores/territories and explicit exclusions are enforced;
6. the adapter surfaces RouteNote validation failures rather than masking them;
7. interrupted runs can resume without blindly creating duplicate drafts;
8. the runner returns evidence-bearing receipts with no secrets;
9. preparation can complete without invoking the final RouteNote submission action;
10. optional final submission cannot occur without a matching, unexpired payload-bound approval;
11. no SongForge `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE` state is inferred solely from browser form completion;
12. unit/typecheck tests pass without requiring live RouteNote credentials;
13. no RouteNote credential, cookie, session state, screenshot, track binary, or private account data is committed to the public repository.

## 16. Non-Goals

- Reverse-engineering private RouteNote APIs.
- Circumventing anti-bot controls, MFA, CAPTCHA, or account verification.
- Moving release metadata authority out of `@songforge/release`.
- Creating a second release-state machine.
- Treating successful browser clicks as proof of provider acceptance or DSP publication.
- Requiring a continuously running server. The browser runner is designed to execute on demand in any supported SongForge worker/CLI environment with a compatible browser runtime.

## 17. Delivery Sequence

1. Add RouteNote browser types, browser port, errors, and fake-page tests.
2. Add centralized selectors and deterministic draft workflow.
3. Add audio/artwork upload confirmation and store-policy enforcement.
4. Add Playwright runtime/session/evidence adapter.
5. Update integration health/capabilities.
6. Update RouteNote release handoff projection and payload tests.
7. Add an independently callable SongForge execution entrypoint.
8. Add opt-in live smoke support with all external writes disabled by default.
9. Verify typecheck/unit tests and review failure evidence paths.

This sequence yields useful testable capability before any live RouteNote account action is attempted.
