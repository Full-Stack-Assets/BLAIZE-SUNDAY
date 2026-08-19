export type G2VoiceMode =
  | "SUNDAY_TALK"
  | "BLAIZE_MODE"
  | "VELVET"
  | "ZERO_STATIC";

export interface G2BlindKeyEntry {
  blindId: string;
  candidate: string;
  mode: G2VoiceMode;
}

export interface G2RaterResponse {
  raterId: string;
  groups: string[][];
}

export interface G2Prerequisites {
  loudnessNormalized: boolean;
  commercialPermissionVerified: boolean;
  persistenceContinuityVerified: boolean;
  singingIdentityValidated: boolean;
  finalHumanApproval: boolean;
}

export interface G2PairResult {
  leftMode: G2VoiceMode;
  rightMode: G2VoiceMode;
  accuracy: number;
  recognizedBy: number;
  raterCount: number;
}

export interface G2EvaluationResult {
  selectedCandidate: string;
  raterCount: number;
  aggregateSamePerformerAccuracy: number;
  pairResults: G2PairResult[];
  minimumPairAccuracy: number;
  recognitionPass: boolean;
  prerequisitesPass: boolean;
  eligibleForLock: boolean;
  blockers: string[];
}

const REQUIRED_RATERS = 12;
const AGGREGATE_THRESHOLD = 0.7;
const PAIR_THRESHOLD = 0.6;

const REQUIRED_MODES: G2VoiceMode[] = [
  "SUNDAY_TALK",
  "BLAIZE_MODE",
  "VELVET",
  "ZERO_STATIC",
];

function groupedTogether(
  response: G2RaterResponse,
  leftId: string,
  rightId: string,
): boolean {
  return response.groups.some(
    (group) => group.includes(leftId) && group.includes(rightId),
  );
}

function assertValidResponses(
  responses: G2RaterResponse[],
  knownBlindIds: Set<string>,
): void {
  const raterIds = new Set<string>();

  for (const response of responses) {
    if (!response.raterId.trim()) {
      throw new Error("Every G2 response requires a non-empty raterId.");
    }
    if (raterIds.has(response.raterId)) {
      throw new Error(`Duplicate G2 raterId: ${response.raterId}`);
    }
    raterIds.add(response.raterId);

    const seen = new Set<string>();
    for (const group of response.groups) {
      for (const blindId of group) {
        if (!knownBlindIds.has(blindId)) {
          throw new Error(`Unknown G2 blindId: ${blindId}`);
        }
        if (seen.has(blindId)) {
          throw new Error(
            `G2 blindId ${blindId} appears in more than one group for rater ${response.raterId}.`,
          );
        }
        seen.add(blindId);
      }
    }
  }
}

export function evaluateG2VoiceRecognition(input: {
  selectedCandidate: string;
  blindKey: G2BlindKeyEntry[];
  responses: G2RaterResponse[];
  prerequisites: G2Prerequisites;
}): G2EvaluationResult {
  const { selectedCandidate, blindKey, responses, prerequisites } = input;
  const knownBlindIds = new Set(blindKey.map((entry) => entry.blindId));
  assertValidResponses(responses, knownBlindIds);

  const selected = blindKey.filter(
    (entry) => entry.candidate === selectedCandidate,
  );

  if (selected.length !== REQUIRED_MODES.length) {
    throw new Error(
      `Candidate ${selectedCandidate} must have exactly four G2 mode renders.`,
    );
  }

  const byMode = new Map(selected.map((entry) => [entry.mode, entry]));
  for (const mode of REQUIRED_MODES) {
    if (!byMode.has(mode)) {
      throw new Error(
        `Candidate ${selectedCandidate} is missing required G2 mode ${mode}.`,
      );
    }
  }

  const pairResults: G2PairResult[] = [];
  let totalRecognized = 0;
  let totalPairJudgements = 0;

  for (let leftIndex = 0; leftIndex < REQUIRED_MODES.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < REQUIRED_MODES.length;
      rightIndex += 1
    ) {
      const leftMode = REQUIRED_MODES[leftIndex];
      const rightMode = REQUIRED_MODES[rightIndex];
      const left = byMode.get(leftMode)!;
      const right = byMode.get(rightMode)!;
      const recognizedBy = responses.filter((response) =>
        groupedTogether(response, left.blindId, right.blindId),
      ).length;
      const accuracy = responses.length ? recognizedBy / responses.length : 0;

      pairResults.push({
        leftMode,
        rightMode,
        accuracy,
        recognizedBy,
        raterCount: responses.length,
      });
      totalRecognized += recognizedBy;
      totalPairJudgements += responses.length;
    }
  }

  const aggregateSamePerformerAccuracy = totalPairJudgements
    ? totalRecognized / totalPairJudgements
    : 0;
  const minimumPairAccuracy = pairResults.length
    ? Math.min(...pairResults.map((pair) => pair.accuracy))
    : 0;

  const blockers: string[] = [];
  if (responses.length < REQUIRED_RATERS) {
    blockers.push(`Need at least ${REQUIRED_RATERS} valid independent raters.`);
  }
  if (aggregateSamePerformerAccuracy < AGGREGATE_THRESHOLD) {
    blockers.push("Aggregate same-performer recognition is below 70%.");
  }
  if (minimumPairAccuracy < PAIR_THRESHOLD) {
    blockers.push("At least one required mode-pair category is below 60%.");
  }

  const recognitionPass =
    responses.length >= REQUIRED_RATERS &&
    aggregateSamePerformerAccuracy >= AGGREGATE_THRESHOLD &&
    minimumPairAccuracy >= PAIR_THRESHOLD;

  if (!prerequisites.loudnessNormalized) {
    blockers.push("Blind audition assets are not verified loudness-normalized.");
  }
  if (!prerequisites.commercialPermissionVerified) {
    blockers.push("Commercial-use permission for the exact voice asset is unverified.");
  }
  if (!prerequisites.persistenceContinuityVerified) {
    blockers.push("Persistent voice continuity is unverified.");
  }
  if (!prerequisites.singingIdentityValidated) {
    blockers.push("Identity-preserving singing capability is unvalidated.");
  }
  if (!prerequisites.finalHumanApproval) {
    blockers.push("Final Artist Principal G2 approval is not recorded.");
  }

  const prerequisitesPass = Object.values(prerequisites).every(Boolean);

  return {
    selectedCandidate,
    raterCount: responses.length,
    aggregateSamePerformerAccuracy,
    pairResults,
    minimumPairAccuracy,
    recognitionPass,
    prerequisitesPass,
    eligibleForLock: recognitionPass && prerequisitesPass,
    blockers,
  };
}
