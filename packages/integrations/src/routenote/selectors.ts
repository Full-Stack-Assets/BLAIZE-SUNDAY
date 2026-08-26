import type { RouteNoteLocator } from "./browser-port.ts";

export const ROUTENOTE_HOME_URL = "https://www.routenote.com/";

function locator(
  operation: string,
  candidates: RouteNoteLocator["candidates"]
): RouteNoteLocator {
  return { operation, candidates };
}

export const ROUTENOTE_SELECTORS = {
  loginSurface: locator("login-surface", [
    { kind: "role", role: "button", value: "Login" },
    { kind: "role", role: "link", value: "Login" },
    { kind: "text", value: "Login" }
  ]),
  distributionNav: locator("distribution-nav", [
    { kind: "role", role: "link", value: "Distribution" },
    { kind: "text", value: "Distribution" }
  ]),
  distributionPage: locator("distribution-page", [
    { kind: "role", role: "button", value: "Create New Release" },
    { kind: "text", value: "Create New Release" }
  ]),
  draftListRows: locator("draft-list-rows", [
    { kind: "css", value: "[data-release-title]" },
    { kind: "css", value: "table tbody tr" }
  ]),
  createNewRelease: locator("create-new-release", [
    { kind: "role", role: "button", value: "Create New Release" },
    { kind: "role", role: "link", value: "Create New Release" },
    { kind: "text", value: "Create New Release" }
  ]),
  releaseTitle: locator("release-title", [
    { kind: "label", value: "Release Title" },
    { kind: "name", value: "releaseTitle" },
    { kind: "name", value: "release_title" }
  ]),
  releaseUpc: locator("release-upc", [
    { kind: "label", value: "UPC" },
    { kind: "name", value: "upc" }
  ]),
  createRelease: locator("create-release", [
    { kind: "role", role: "button", value: "Create Release" },
    { kind: "text", value: "Create Release" }
  ]),
  releaseEditor: locator("release-editor", [
    { kind: "text", value: "Album Details" },
    { kind: "text", value: "Add Audio" }
  ]),
  albumDetails: locator("album-details", [
    { kind: "role", role: "link", value: "Album Details" },
    { kind: "role", role: "button", value: "Album Details" },
    { kind: "text", value: "Album Details" }
  ]),
  albumLanguage: locator("album-language", [
    { kind: "label", value: "Language" },
    { kind: "name", value: "language" }
  ]),
  albumPrimaryArtist: locator("album-primary-artist", [
    { kind: "label", value: "Primary Artist" },
    { kind: "name", value: "primaryArtist" },
    { kind: "name", value: "primary_artist" }
  ]),
  albumPrimaryGenre: locator("album-primary-genre", [
    { kind: "label", value: "Primary Genre" },
    { kind: "name", value: "primaryGenre" },
    { kind: "name", value: "primary_genre" }
  ]),
  albumSecondaryGenre: locator("album-secondary-genre", [
    { kind: "label", value: "Secondary Genre" },
    { kind: "name", value: "secondaryGenre" },
    { kind: "name", value: "secondary_genre" }
  ]),
  albumCompositionCopyright: locator("album-composition-copyright", [
    { kind: "label", value: "Composition Copyright" },
    { kind: "name", value: "compositionCopyright" }
  ]),
  albumSoundRecordingCopyright: locator("album-sound-recording-copyright", [
    { kind: "label", value: "Sound Recording Copyright" },
    { kind: "name", value: "soundRecordingCopyright" }
  ]),
  albumRecordLabel: locator("album-record-label", [
    { kind: "label", value: "Record Label Name" },
    { kind: "label", value: "Record Label" },
    { kind: "name", value: "recordLabel" }
  ]),
  albumOriginalReleaseDate: locator("album-original-release-date", [
    { kind: "label", value: "Originally Released" },
    { kind: "label", value: "Original Release Date" },
    { kind: "name", value: "originalReleaseDate" }
  ]),
  albumSalesStartDate: locator("album-sales-start-date", [
    { kind: "label", value: "Sales Start Date" },
    { kind: "name", value: "salesStartDate" }
  ]),
  albumExplicit: locator("album-explicit", [
    { kind: "label", value: "Explicit Content" },
    { kind: "name", value: "explicit" }
  ]),
  saveAlbumDetails: locator("save-album-details", [
    { kind: "role", role: "button", value: "Save and Continue" },
    { kind: "text", value: "Save and Continue" }
  ]),
  addAudio: locator("add-audio", [
    { kind: "role", role: "link", value: "Add Audio" },
    { kind: "role", role: "button", value: "Add Audio" },
    { kind: "text", value: "Add Audio" }
  ]),
  audioFileInput: locator("audio-file-input", [
    { kind: "label", value: "Choose File" },
    { kind: "css", value: "input[type='file'][accept*='audio']" },
    { kind: "css", value: "input[type='file']" }
  ]),
  saveAudio: locator("save-audio", [
    { kind: "role", role: "button", value: "Save and Continue" },
    { kind: "text", value: "I'm Finished" },
    { kind: "text", value: "Save and Continue" }
  ]),
  addArtwork: locator("add-artwork", [
    { kind: "role", role: "link", value: "Add Artwork" },
    { kind: "role", role: "button", value: "Add Artwork" },
    { kind: "text", value: "Add Artwork" }
  ]),
  artworkFileInput: locator("artwork-file-input", [
    { kind: "label", value: "Choose File" },
    { kind: "css", value: "input[type='file'][accept*='image']" },
    { kind: "css", value: "input[type='file']" }
  ]),
  artworkUploadConfirmation: locator("artwork-upload-confirmation", [
    { kind: "text", value: "Artwork Uploaded" },
    { kind: "text", value: "Artwork added" },
    { kind: "css", value: "img[alt*='artwork' i]" }
  ]),
  saveArtwork: locator("save-artwork", [
    { kind: "role", role: "button", value: "Save and Continue" },
    { kind: "text", value: "Save and Continue" }
  ]),
  manageStores: locator("manage-stores", [
    { kind: "role", role: "link", value: "Manage Stores" },
    { kind: "role", role: "button", value: "Manage Stores" },
    { kind: "text", value: "Manage Stores" }
  ]),
  saveStores: locator("save-stores", [
    { kind: "role", role: "button", value: "Save and Continue" },
    { kind: "role", role: "button", value: "Save" },
    { kind: "text", value: "Save and Continue" }
  ]),
  providerValidationErrors: locator("provider-validation-errors", [
    { kind: "css", value: "[role='alert']" },
    { kind: "css", value: ".validation-error" },
    { kind: "css", value: ".error-message" }
  ]),
  draftReady: locator("draft-ready", [
    { kind: "text", value: "Manage Stores" },
    { kind: "text", value: "Release" }
  ])
} as const;

export function draftByTitle(title: string): RouteNoteLocator {
  return locator(`draft:${title}`, [
    { kind: "role", role: "link", value: title },
    { kind: "text", value: title }
  ]);
}

export function audioUploadConfirmation(trackIndex: number): RouteNoteLocator {
  return locator(`audio-upload-confirmation:${trackIndex}`, [
    { kind: "text", value: `Track ${trackIndex}` },
    { kind: "css", value: `[data-track-index='${trackIndex}']` }
  ]);
}

export function trackField(
  trackIndex: number,
  field: "title" | "artist" | "language" | "explicit" | "isrc"
): RouteNoteLocator {
  const labels: Record<typeof field, string> = {
    title: "Track Name",
    artist: "Primary Artist",
    language: "Audio Language",
    explicit: "Explicit Content",
    isrc: "ISRC"
  };
  return locator(`track:${trackIndex}:${field}`, [
    { kind: "label", value: labels[field] },
    { kind: "name", value: `${field}_${trackIndex}` }
  ]);
}

export function trackWriterField(
  trackIndex: number,
  writerIndex: number,
  field: "firstName" | "lastName" | "role"
): RouteNoteLocator {
  const labels = {
    firstName: "First Name",
    lastName: "Last Name",
    role: "Role"
  } as const;
  return locator(`track:${trackIndex}:writer:${writerIndex}:${field}`, [
    { kind: "label", value: labels[field] },
    { kind: "name", value: `writer_${writerIndex}_${field}` }
  ]);
}

export function storeLocator(store: string): RouteNoteLocator {
  const labels: Record<string, string> = {
    SPOTIFY: "Spotify",
    APPLE_MUSIC: "Apple Music",
    YOUTUBE_MUSIC: "YouTube Music",
    AMAZON_MUSIC: "Amazon Music",
    CONTENT_RECOGNITION: "Content Recognition",
    MELON: "Melon",
    GENIE: "Genie",
    BUGS: "Bugs",
    FLO: "Flo",
    VIBE: "Vibe"
  };
  const label = labels[store] ?? store;
  return locator(`store:${store}`, [
    { kind: "label", value: label },
    { kind: "text", value: label }
  ]);
}
