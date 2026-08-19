import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateG2VoiceRecognition,
  type G2BlindKeyEntry,
  type G2Prerequisites,
  type G2RaterResponse,
} from "./voice-g2-evaluation.ts";

const key: G2BlindKeyEntry[] = [
  { blindId: "BS-G2-01", candidate: "B3", mode: "SUNDAY_TALK" },
  { blindId: "BS-G2-04", candidate: "B3", mode: "ZERO_STATIC" },
  { blindId: "BS-G2-05", candidate: "B3", mode: "VELVET" },
  { blindId: "BS-G2-11", candidate: "B3", mode: "BLAIZE_MODE" },
  { blindId: "BS-G2-02", candidate: "A", mode: "VELVET" },
  { blindId: "BS-G2-03", candidate: "A", mode: "BLAIZE_MODE" },
  { blindId: "BS-G2-07", candidate: "A", mode: "SUNDAY_TALK" },
  { blindId: "BS-G2-12", candidate: "A", mode: "ZERO_STATIC" },
  { blindId: "BS-G2-06", candidate: "C", mode: "VELVET" },
  { blindId: "BS-G2-08", candidate: "C", mode: "SUNDAY_TALK" },
  { blindId: "BS-G2-09", candidate: "C", mode: "ZERO_STATIC" },
  { blindId: "BS-G2-10", candidate: "C", mode: "BLAIZE_MODE" },
];

const allPrerequisites: G2Prerequisites = {
  loudnessNormalized: true,
  commercialPermissionVerified: true,
  persistenceContinuityVerified: true,
  singingIdentityValidated: true,
  finalHumanApproval: true,
};

function responses(count: number, b3Group: string[]): G2RaterResponse[] {
  return Array.from({ length: count }, (_, index) => ({
    raterId: `rater-${index + 1}`,
    groups: [
      b3Group,
      ["BS-G2-02", "BS-G2-03", "BS-G2-07", "BS-G2-12"],
      ["BS-G2-06", "BS-G2-08", "BS-G2-09", "BS-G2-10"],
    ],
  }));
}

test("requires at least 12 independent raters", () => {
  const result = evaluateG2VoiceRecognition({
    selectedCandidate: "B3",
    blindKey: key,
    responses: responses(11, ["BS-G2-01", "BS-G2-04", "BS-G2-05", "BS-G2-11"]),
    prerequisites: allPrerequisites,
  });

  assert.equal(result.recognitionPass, false);
  assert.equal(result.eligibleForLock, false);
  assert.match(result.blockers.join(" "), /at least 12/i);
});

test("passes recognition when all 12 raters identify B3 across all four modes", () => {
  const result = evaluateG2VoiceRecognition({
    selectedCandidate: "B3",
    blindKey: key,
    responses: responses(12, ["BS-G2-01", "BS-G2-04", "BS-G2-05", "BS-G2-11"]),
    prerequisites: allPrerequisites,
  });

  assert.equal(result.aggregateSamePerformerAccuracy, 1);
  assert.equal(result.minimumPairAccuracy, 1);
  assert.equal(result.recognitionPass, true);
  assert.equal(result.eligibleForLock, true);
});

test("fails when one mode-pair category falls below 60% even if aggregate exceeds 70%", () => {
  const full = responses(7, ["BS-G2-01", "BS-G2-04", "BS-G2-05", "BS-G2-11"]);
  const splitVelvet = Array.from({ length: 5 }, (_, index) => ({
    raterId: `split-rater-${index + 1}`,
    groups: [
      ["BS-G2-01", "BS-G2-04", "BS-G2-11"],
      ["BS-G2-05"],
      ["BS-G2-02", "BS-G2-03", "BS-G2-07", "BS-G2-12"],
      ["BS-G2-06", "BS-G2-08", "BS-G2-09", "BS-G2-10"],
    ],
  }));

  const result = evaluateG2VoiceRecognition({
    selectedCandidate: "B3",
    blindKey: key,
    responses: [...full, ...splitVelvet],
    prerequisites: allPrerequisites,
  });

  assert.ok(result.aggregateSamePerformerAccuracy > 0.7);
  assert.ok(result.minimumPairAccuracy < 0.6);
  assert.equal(result.recognitionPass, false);
  assert.equal(result.eligibleForLock, false);
});

test("hard prerequisites prevent lock even with perfect recognition", () => {
  const result = evaluateG2VoiceRecognition({
    selectedCandidate: "B3",
    blindKey: key,
    responses: responses(12, ["BS-G2-01", "BS-G2-04", "BS-G2-05", "BS-G2-11"]),
    prerequisites: {
      ...allPrerequisites,
      loudnessNormalized: false,
      singingIdentityValidated: false,
    },
  });

  assert.equal(result.recognitionPass, true);
  assert.equal(result.prerequisitesPass, false);
  assert.equal(result.eligibleForLock, false);
  assert.match(result.blockers.join(" "), /loudness-normalized/i);
  assert.match(result.blockers.join(" "), /singing capability/i);
});

test("rejects duplicate rater IDs", () => {
  assert.throws(
    () =>
      evaluateG2VoiceRecognition({
        selectedCandidate: "B3",
        blindKey: key,
        responses: [
          { raterId: "same", groups: [["BS-G2-01", "BS-G2-04"]] },
          { raterId: "same", groups: [["BS-G2-05", "BS-G2-11"]] },
        ],
        prerequisites: allPrerequisites,
      }),
    /Duplicate G2 raterId/,
  );
});
