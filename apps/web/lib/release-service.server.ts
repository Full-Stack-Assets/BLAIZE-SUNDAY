/**
 * Lab mode: release command service is not wired to Prisma yet.
 * Client Approvals / Releases use local persistence.
 */

export class LabReleaseUnavailableError extends Error {
  readonly code = "LAB_RELEASE_SERVICE_UNAVAILABLE";
  readonly status = 503;

  constructor() {
    super("LAB_RELEASE_SERVICE_UNAVAILABLE");
    this.name = "LabReleaseUnavailableError";
  }
}

function unavailable(..._args: unknown[]): never {
  throw new LabReleaseUnavailableError();
}

export function createReleaseCommandService() {
  return {
    resolveApproval: unavailable,
    prepareDistribution: unavailable,
    recordExternalSubmission: unavailable,
    recordAccepted: unavailable,
    recordScheduled: unavailable,
    recordLive: unavailable,
  };
}
