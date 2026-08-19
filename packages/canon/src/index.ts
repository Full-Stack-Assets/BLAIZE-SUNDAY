export const CANON_VERSION = "BLAIZE_CANON_v4.0";

export const blaizeCanonV4 = {
  version: CANON_VERSION,
  artist: "BLAIZE SUNDAY",
  northStar: "BLAIZE SUNDAY looks expensive, feels weird, and tells the truth sideways.",
  visualRule: "Every image contains one beautiful thing and one wrong thing.",
  voiceName: "SUNDAY AFTER MIDNIGHT",
  balance: { funny: 0.35, cool: 0.35, vulnerable: 0.3 },
  safety: [
    "Never cruel",
    "Never misogynistic",
    "Never hateful",
    "Never imitate a living performer"
  ],
  proofCycle: [
    "LOOKS EXPENSIVE",
    "MY THERAPIST BLOCKED ME",
    "BAD DECISIONS, GREAT OUTFIT"
  ],
  writingEngine: "Contradiction, short quotable fragments, emotional disruption.",
  prohibited: [
    "celebrity imitation",
    "living-artist soundalikes",
    "unapproved replacement voice",
    "generic wealth fantasy"
  ]
} as const;

export type BlaizeCanonV4 = typeof blaizeCanonV4;

export function getOperatingCanon() {
  return blaizeCanonV4;
}

export function nextProofCycleTitle(existingTitles: string[]): string {
  const owned = new Set(existingTitles.map((title) => title.toUpperCase()));
  return blaizeCanonV4.proofCycle.find((title) => !owned.has(title)) ?? "PRETTY BOY PROBLEMS";
}
