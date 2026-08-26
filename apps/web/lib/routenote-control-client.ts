import type {
  RouteNoteControlSnapshot,
  RouteNoteControlStatus,
  RouteNoteDraftSummary,
  RouteNoteReleaseOption
} from "./routenote-control.ts";

export interface RouteNoteClientState {
  status: RouteNoteControlStatus;
  hostAvailable: boolean;
  releases: RouteNoteReleaseOption[];
  selectedReleaseId?: string;
  draft?: RouteNoteDraftSummary;
  error?: { code: string; message: string };
}

export type RouteNoteClientEvent =
  | { type: "SNAPSHOT_LOADED"; snapshot: RouteNoteControlSnapshot }
  | { type: "RELEASE_SELECTED"; releaseId: string }
  | { type: "CONNECTION_RESULT"; status: "CONNECTED" | "LOGIN_REQUIRED" }
  | { type: "PREPARE_STARTED" }
  | { type: "DRAFT_READY"; draft: RouteNoteDraftSummary }
  | { type: "FAILED"; error: { code: string; message: string } };

export function createInitialRouteNoteControlState(): RouteNoteClientState {
  return {
    status: "NOT_CONNECTED",
    hostAvailable: true,
    releases: []
  };
}

export function reduceRouteNoteControlState(
  state: RouteNoteClientState,
  event: RouteNoteClientEvent
): RouteNoteClientState {
  switch (event.type) {
    case "SNAPSHOT_LOADED": {
      const releases = event.snapshot.releases;
      const selectedReleaseId = releases.some(
        release => release.id === state.selectedReleaseId
      )
        ? state.selectedReleaseId
        : releases[0]?.id;
      return {
        status: event.snapshot.status,
        hostAvailable: event.snapshot.hostAvailable,
        releases,
        ...(selectedReleaseId ? { selectedReleaseId } : {}),
        ...(event.snapshot.latestDraft ? { draft: event.snapshot.latestDraft } : {}),
        ...(event.snapshot.error ? { error: event.snapshot.error } : {})
      };
    }

    case "RELEASE_SELECTED":
      return {
        ...state,
        selectedReleaseId: event.releaseId,
        draft:
          state.draft?.releaseId === event.releaseId ? state.draft : undefined,
        error: undefined
      };

    case "CONNECTION_RESULT":
      return {
        ...state,
        status: event.status,
        error: undefined
      };

    case "PREPARE_STARTED":
      return {
        ...state,
        status: "PREPARING",
        draft: undefined,
        error: undefined
      };

    case "DRAFT_READY":
      return {
        ...state,
        status: "DRAFT_READY",
        draft: event.draft,
        error: undefined
      };

    case "FAILED":
      return {
        ...state,
        status: "FAILED",
        error: event.error
      };
  }
}

export function selectedRouteNoteRelease(
  state: RouteNoteClientState
): RouteNoteReleaseOption | undefined {
  return state.releases.find(release => release.id === state.selectedReleaseId);
}

export function canPrepareSelectedRelease(state: RouteNoteClientState): boolean {
  if (state.status !== "CONNECTED") return false;
  const release = selectedRouteNoteRelease(state);
  if (!release?.readiness.ready) return false;
  return release.status === "PREPARED" || release.status === "AWAITING_AUTHORIZATION";
}
