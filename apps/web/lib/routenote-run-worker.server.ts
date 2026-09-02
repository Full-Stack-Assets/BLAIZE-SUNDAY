import { processNextRouteNoteRun } from "./routenote-run.server.ts";
import {
  createWebRouteNoteRunControlDependencies,
  createWebRouteNoteRunStore
} from "./routenote-runtime.server.ts";

const POLL_MS = 2_000;

type WorkerState = {
  started: boolean;
  ticking: boolean;
};

const globalWorker = globalThis as typeof globalThis & {
  __songforgeRouteNoteWorker?: WorkerState;
};

function workerState(): WorkerState {
  if (!globalWorker.__songforgeRouteNoteWorker) {
    globalWorker.__songforgeRouteNoteWorker = { started: false, ticking: false };
  }
  return globalWorker.__songforgeRouteNoteWorker;
}

export function routeNoteRunWorkerStatus(): WorkerState {
  return { ...workerState() };
}

export async function startRouteNoteRunWorker(): Promise<void> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.ROUTENOTE_RUN_WORKER_DISABLED === "1" ||
    !process.env.DATABASE_URL?.trim()
  ) {
    return;
  }

  const state = workerState();
  if (state.started) return;

  const dependencies = createWebRouteNoteRunControlDependencies();
  const store = createWebRouteNoteRunStore();

  try {
    // A process restart may leave a provider job marked RUNNING. Never automatically
    // replay it because RouteNote may already contain a partially completed draft.
    // Convert it to an explicit operator-review item instead.
    await store.recoverInterrupted();
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "ROUTENOTE_WORKER_START_FAILED";
    console.error(`[songforge:routenote-worker] ${code}`);
    return;
  }

  state.started = true;

  const tick = async () => {
    if (state.ticking) return;
    state.ticking = true;
    try {
      while (await processNextRouteNoteRun(dependencies, store)) {
        // Drain the single-owner queue serially. Browser profile leasing provides a
        // second line of defense against concurrent provider sessions.
      }
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : "ROUTENOTE_WORKER_TICK_FAILED";
      console.error(`[songforge:routenote-worker] ${code}`);
    } finally {
      state.ticking = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), POLL_MS);
  timer.unref?.();
}
