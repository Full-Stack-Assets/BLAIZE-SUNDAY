export interface CatalogTrack {
  readonly id: string;
  readonly title: string;
  readonly visualMode: string;
  readonly signatureSound: string;
}

export const TRACKS = [
  { id: "01_LOOKS_EXPENSIVE", title: "LOOKS EXPENSIVE", visualMode: "Luxury Noir", signatureSound: "card-reader decline" },
  { id: "02_MY_THERAPIST_BLOCKED_ME", title: "MY THERAPIST BLOCKED ME", visualMode: "Beautiful but Wrong", signatureSound: "customer-service hold music" },
  { id: "03_BAD_DECISIONS_GREAT_OUTFIT", title: "BAD DECISIONS, GREAT OUTFIT", visualMode: "Flash / Motion / Flex", signatureSound: "camera autofocus motor" },
  { id: "04_PRETTY_BOY_PROBLEMS", title: "PRETTY BOY PROBLEMS", visualMode: "Flash / Motion / Flex", signatureSound: "perfume atomizer" },
  { id: "05_DELETE_AFTER_LISTENING", title: "DELETE AFTER LISTENING", visualMode: "Luxury Noir", signatureSound: "voice-message deletion tone" },
  { id: "06_NO_SIGNAL", title: "NO SIGNAL", visualMode: "Beautiful but Wrong", signatureSound: "cellular dropout / modem fragments" },
  { id: "07_2_17_AM", title: "2:17 AM", visualMode: "Luxury Noir", signatureSound: "hotel HVAC / elevator bell / unread notification" },
  { id: "08_PARALLEL_YOU", title: "PARALLEL YOU", visualMode: "Flash / Motion / Flex", signatureSound: "reversed navigation prompts" },
  { id: "09_ROOM_SERVICE_FOR_ONE", title: "ROOM SERVICE FOR ONE", visualMode: "Luxury Noir", signatureSound: "room-service cart / cloche / receipt printer" },
  { id: "10_WRONG_FLOOR", title: "WRONG FLOOR", visualMode: "Beautiful but Wrong", signatureSound: "elevator ding / floor voice / vending-machine hum" }
] as const satisfies readonly CatalogTrack[];

function slugPrefix(track: CatalogTrack): string {
  return track.id;
}

export function requiredDeliverables(track: CatalogTrack): string[] {
  const p = slugPrefix(track);
  return [
    `MASTER/${p}_ARCHIVE_MASTER_24-48.wav`,
    `MASTER/${p}_MASTER.flac`,
    `MASTER/${p}_REFERENCE_320.mp3`,
    `ALTERNATES/${p}_INSTRUMENTAL_DERIVED.wav`,
    `ALTERNATES/${p}_VOCAL_DERIVED.wav`,
    `ALTERNATES/${p}_INSTRUMENTAL_PERFORMANCE_MIX.wav`,
    `ALTERNATES/${p}_VOCAL_FORWARD_REVIEW_MIX.wav`,
    `ALTERNATES/${p}_MUSIC_FORWARD_MIX.wav`,
    `ALTERNATES/${p}_CLEAN_MIX.wav`,
    "ART/cover_3000x3000.png",
    "ART/vertical_9x16.png",
    "ART/thumbnail_16x9.png",
    "VIDEO/visualizer_master.mp4",
    "VIDEO/lyric_video_master.mp4",
    "VIDEO/short_hook_01.mp4",
    "VIDEO/treatment.md",
    "METADATA/provenance.json",
    "METADATA/audio_qc.json",
  ];
}

export const REQUIRED_SUPPORT_FILES = [
  "METADATA/lyrics.txt",
  "METADATA/credits.json",
  "METADATA/checksums.sha256",
] as const;
