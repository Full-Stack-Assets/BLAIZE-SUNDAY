/**
 * Lab mode: release command service is not wired to Prisma yet.
 * Client-side Approvals / Releases use local persistence.
 * These server routes return structured 503 until DB is connected.
 */

export class LabReleaseUnavailableError extends Error {
  readonly code = "LAB_RELEASE_SERVICE_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super("LAB_RELEASE_SERVICE_UNAVAILABLE");
    this.name = "LabReleaseUnavailableError";
  }
}

export function createReleaseCommandService() {
  return {
    async resolveApproval() {
      throw new LabReleaseUnavailableError();
    },
    async prepareDistribution() {
      throw new LabReleaseUnavailableError();
    },
    async recordExternalSubmission() {
      throw new LabReleaseUnavailableError();
    },
    async recordAccepted() {
      throw new LabReleaseUnavailableError();
    },
    async recordScheduled() {
      throw new LabReleaseUnavailableError();
    },
    async recordLive() {
      throw new LabReleaseUnavailableError();
    },
  };
}
