import { executeCreateNextRelease } from "@songforge/agents";

const redisUrl = process.env.REDIS_URL;

async function main() {
  if (!redisUrl) {
    console.warn(
      "[songforge-worker] REDIS_URL unset. Queue is UNCONFIGURED. API will run CREATE NEXT RELEASE inline."
    );
    await new Promise(() => undefined);
    return;
  }

  const { Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker(
    "songforge-workflows",
    async (job) => {
      const data = job.data as { actor: string; idempotencyKey: string };
      return executeCreateNextRelease(data);
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(`[songforge-worker] completed ${job.id}`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[songforge-worker] failed ${job?.id}`, error);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
