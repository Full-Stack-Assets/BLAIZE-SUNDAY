export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startRouteNoteRunWorker } = await import(
    "./lib/routenote-run-worker.server.ts"
  );
  await startRouteNoteRunWorker();
}
