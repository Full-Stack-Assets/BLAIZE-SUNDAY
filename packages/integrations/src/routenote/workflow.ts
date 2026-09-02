import type { RouteNoteBrowserPort } from "./browser-port.ts";
import {
  ROUTENOTE_HOME_URL,
  ROUTENOTE_SELECTORS,
  audioUploadConfirmation,
  draftByTitle,
  storeLocator,
  trackField,
  trackWriterField
} from "./selectors.ts";
import {
  RouteNoteBrowserError,
  type RouteNoteBrowserJob,
  type RouteNoteExecutionReceipt,
  type RouteNoteExecutionStep,
  type RouteNoteTrackInput,
  type RouteNoteTrackReceipt
} from "./types.ts";

export interface RouteNoteWorkflowOptions {
  now?: () => Date;
  onStep?: (step: RouteNoteExecutionStep) => void | Promise<void>;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function validateJob(job: RouteNoteBrowserJob): void {
  if (
    job.payload.provider !== "routenote-free" ||
    job.payload.handoff.mode !== "BROWSER_AUTOMATION"
  ) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_METADATA_REJECTED",
      "RouteNote browser workflow requires a validated browser-automation payload"
    );
  }

  if (!job.payloadHash.trim() || job.assets.audio.length === 0) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_METADATA_REJECTED",
      "RouteNote draft preparation requires a payload hash and at least one audio track"
    );
  }

  const indexes = new Set<number>();
  for (const track of job.assets.audio) {
    if (
      !Number.isInteger(track.trackIndex) ||
      track.trackIndex < 1 ||
      indexes.has(track.trackIndex) ||
      !track.path.trim() ||
      !track.title.trim() ||
      !track.artistName.trim() ||
      !track.language.trim() ||
      track.writers.length === 0
    ) {
      throw new RouteNoteBrowserError(
        "ROUTENOTE_METADATA_REJECTED",
        `Incomplete or duplicate canonical metadata for track ${track.trackIndex}`
      );
    }
    indexes.add(track.trackIndex);
  }

  if (!job.assets.artwork.path.trim()) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_METADATA_REJECTED",
      "RouteNote draft preparation requires an artwork file path"
    );
  }
}

async function verifySession(port: RouteNoteBrowserPort): Promise<void> {
  await port.goto(ROUTENOTE_HOME_URL);
  if (await port.isVisible(ROUTENOTE_SELECTORS.loginSurface)) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_SESSION_REQUIRED",
      "An authenticated RouteNote browser session is required"
    );
  }

  await port.waitForVisible(ROUTENOTE_SELECTORS.distributionNav);
  await port.click(ROUTENOTE_SELECTORS.distributionNav);
  await port.waitForVisible(ROUTENOTE_SELECTORS.distributionPage);
}

async function resolveOrCreateDraft(
  job: RouteNoteBrowserJob,
  port: RouteNoteBrowserPort
): Promise<{ created: boolean }> {
  const title = job.payload.routeNoteForm.releaseData.releaseTitle;
  const rows = await port.allText(ROUTENOTE_SELECTORS.draftListRows);
  const matches = rows.filter(row => normalize(row) === normalize(title));

  if (matches.length > 1) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_DUPLICATE_DRAFT_AMBIGUOUS",
      `Multiple RouteNote drafts match release title: ${title}`
    );
  }

  if (matches.length === 1) {
    await port.click(draftByTitle(title));
    await port.waitForVisible(ROUTENOTE_SELECTORS.releaseEditor);
    return { created: false };
  }

  await port.click(ROUTENOTE_SELECTORS.createNewRelease);
  await port.fill(ROUTENOTE_SELECTORS.releaseTitle, title);

  const upc = job.payload.routeNoteForm.releaseData.upc;
  if (upc !== "GENERATE_FREE" && upc.trim()) {
    await port.fill(ROUTENOTE_SELECTORS.releaseUpc, upc);
  }

  await port.click(ROUTENOTE_SELECTORS.createRelease);
  await port.waitForVisible(ROUTENOTE_SELECTORS.releaseEditor);
  return { created: true };
}

async function fillAlbumDetails(
  job: RouteNoteBrowserJob,
  port: RouteNoteBrowserPort
): Promise<void> {
  const album = job.payload.routeNoteForm.albumDetails;

  await port.click(ROUTENOTE_SELECTORS.albumDetails);
  await port.select(ROUTENOTE_SELECTORS.albumLanguage, album.language);
  await port.fill(ROUTENOTE_SELECTORS.albumPrimaryArtist, album.primaryArtist);
  await port.select(ROUTENOTE_SELECTORS.albumPrimaryGenre, album.primaryGenre);
  if (album.secondaryGenre.trim()) {
    await port.select(
      ROUTENOTE_SELECTORS.albumSecondaryGenre,
      album.secondaryGenre
    );
  }
  await port.fill(
    ROUTENOTE_SELECTORS.albumCompositionCopyright,
    album.compositionCopyright
  );
  await port.fill(
    ROUTENOTE_SELECTORS.albumSoundRecordingCopyright,
    album.soundRecordingCopyright
  );
  await port.fill(ROUTENOTE_SELECTORS.albumRecordLabel, album.recordLabelName);
  await port.fill(
    ROUTENOTE_SELECTORS.albumOriginalReleaseDate,
    album.originalReleaseDate
  );
  await port.fill(
    ROUTENOTE_SELECTORS.albumSalesStartDate,
    album.salesStartDate
  );
  await port.check(ROUTENOTE_SELECTORS.albumExplicit, album.explicit);
  await port.click(ROUTENOTE_SELECTORS.saveAlbumDetails);
}

function orderedTracks(job: RouteNoteBrowserJob): RouteNoteTrackInput[] {
  return [...job.assets.audio].sort((left, right) => left.trackIndex - right.trackIndex);
}

function batches<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function fillTrackMetadata(
  track: RouteNoteTrackInput,
  port: RouteNoteBrowserPort
): Promise<void> {
  await port.fill(trackField(track.trackIndex, "title"), track.title);
  await port.fill(trackField(track.trackIndex, "artist"), track.artistName);
  await port.select(trackField(track.trackIndex, "language"), track.language);
  await port.check(trackField(track.trackIndex, "explicit"), track.explicit);
  if (track.isrc?.trim()) {
    await port.fill(trackField(track.trackIndex, "isrc"), track.isrc);
  }

  for (const [writerIndex, writer] of track.writers.entries()) {
    await port.fill(
      trackWriterField(track.trackIndex, writerIndex, "firstName"),
      writer.firstName
    );
    await port.fill(
      trackWriterField(track.trackIndex, writerIndex, "lastName"),
      writer.lastName
    );
    await port.select(
      trackWriterField(track.trackIndex, writerIndex, "role"),
      writer.role
    );
  }
}

async function uploadTracks(
  job: RouteNoteBrowserJob,
  port: RouteNoteBrowserPort
): Promise<RouteNoteTrackReceipt[]> {
  const tracks = orderedTracks(job);
  const receipts: RouteNoteTrackReceipt[] = [];

  await port.click(ROUTENOTE_SELECTORS.addAudio);

  for (const [batchIndex, batch] of batches(tracks, 15).entries()) {
    if (batchIndex > 0) {
      await port.click(ROUTENOTE_SELECTORS.addAudio);
    }

    await port.setInputFiles(
      ROUTENOTE_SELECTORS.audioFileInput,
      batch.map(track => track.path)
    );

    for (const track of batch) {
      if (!(await port.isVisible(audioUploadConfirmation(track.trackIndex)))) {
        throw new RouteNoteBrowserError(
          "ROUTENOTE_AUDIO_CONFIRMATION_MISSING",
          `RouteNote did not confirm upload for track ${track.trackIndex}`
        );
      }
      await fillTrackMetadata(track, port);
      receipts.push({
        trackIndex: track.trackIndex,
        title: track.title,
        uploaded: true
      });
    }

    await port.click(ROUTENOTE_SELECTORS.saveAudio);
  }

  return receipts;
}

async function uploadArtwork(
  job: RouteNoteBrowserJob,
  port: RouteNoteBrowserPort
): Promise<void> {
  await port.click(ROUTENOTE_SELECTORS.addArtwork);
  await port.setInputFiles(ROUTENOTE_SELECTORS.artworkFileInput, [
    job.assets.artwork.path
  ]);

  if (!(await port.isVisible(ROUTENOTE_SELECTORS.artworkUploadConfirmation))) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_ARTWORK_CONFIRMATION_MISSING",
      "RouteNote did not confirm the artwork upload"
    );
  }

  await port.click(ROUTENOTE_SELECTORS.saveArtwork);
}

async function configureStores(
  job: RouteNoteBrowserJob,
  port: RouteNoteBrowserPort
): Promise<void> {
  const requested = [...new Set(job.payload.storePolicy.requested)];
  const excluded = [...new Set(job.payload.storePolicy.excluded)];
  const overlap = requested.filter(store => excluded.includes(store));

  if (overlap.length > 0) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_STORE_POLICY_MISMATCH",
      `Store policy both requests and excludes: ${overlap.join(", ")}`
    );
  }

  await port.click(ROUTENOTE_SELECTORS.manageStores);

  for (const store of requested) {
    await port.check(storeLocator(store), true);
  }
  for (const store of excluded) {
    await port.check(storeLocator(store), false);
  }

  // WORLDWIDE is intentionally represented by leaving territory include/exclude
  // controls untouched. The canonical payload is the only source of this choice.
  await port.click(ROUTENOTE_SELECTORS.saveStores);
}

async function validateProviderDraft(port: RouteNoteBrowserPort): Promise<void> {
  const errors = (await port.allText(ROUTENOTE_SELECTORS.providerValidationErrors))
    .map(value => value.trim())
    .filter(Boolean);

  if (errors.length > 0) {
    throw new RouteNoteBrowserError(
      "ROUTENOTE_PROVIDER_VALIDATION_FAILED",
      errors.join(" | ")
    );
  }

  await port.waitForVisible(ROUTENOTE_SELECTORS.draftReady);
}

function extractProviderReleaseId(url: string): string | undefined {
  const match = url.match(/(?:release|releases|album)[/=-]([A-Za-z0-9_-]+)/i);
  return match?.[1];
}

export async function executeRouteNoteWorkflow(
  job: RouteNoteBrowserJob,
  port: RouteNoteBrowserPort,
  options: RouteNoteWorkflowOptions = {}
): Promise<RouteNoteExecutionReceipt> {
  validateJob(job);
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const completedSteps: RouteNoteExecutionStep[] = [];
  const complete = async (step: RouteNoteExecutionStep) => {
    completedSteps.push(step);
    await options.onStep?.(step);
  };

  await verifySession(port);
  await complete("SESSION_VERIFIED");

  const draft = await resolveOrCreateDraft(job, port);
  await complete("DRAFT_RESOLVED");
  if (draft.created) {
    await complete("RELEASE_DATA_SAVED");
  }

  await fillAlbumDetails(job, port);
  await complete("ALBUM_DETAILS_SAVED");

  const tracks = await uploadTracks(job, port);
  await complete("AUDIO_UPLOADED");

  await uploadArtwork(job, port);
  await complete("ARTWORK_UPLOADED");

  await configureStores(job, port);
  await complete("STORES_CONFIGURED");

  await validateProviderDraft(port);
  await complete("PROVIDER_VALIDATED");

  const routeNoteReleaseUrl = await port.currentUrl();

  return {
    releaseId: job.payload.releaseId,
    payloadHash: job.payloadHash,
    routeNoteReleaseId: extractProviderReleaseId(routeNoteReleaseUrl),
    routeNoteReleaseUrl,
    startedAt,
    finishedAt: now().toISOString(),
    completedSteps,
    tracks,
    artworkUploaded: true,
    storesConfigured: true,
    outcome: "DRAFT_READY"
  };
}
