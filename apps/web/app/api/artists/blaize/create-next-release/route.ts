import { NextResponse } from "next/server";

import { apiError, readJsonObject, requireApprovalActor } from "@/lib/api";
import { executeCreateNextRelease, queueCreateNextRelease } from "@/lib/create-next-release.server";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const actor = requireApprovalActor(request, body);
    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined;

    if (process.env.REDIS_URL) {
      const queued = await queueCreateNextRelease({ actor, idempotencyKey });
      if (queued.created) {
        const { Queue } = await import("bullmq");
        const IORedis = (await import("ioredis")).default;
        const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
        const queue = new Queue("songforge-workflows", { connection });
        await queue.add(
          "create-next-release",
          { actor, idempotencyKey: queued.workflow.idempotencyKey },
          { jobId: queued.workflow.idempotencyKey }
        );
        await queue.close();
        await connection.quit();
      }
      return NextResponse.json(
        {
          ok: true,
          created: queued.created,
          workflowId: queued.workflow.id,
          projectId: queued.workflow.projectId,
          queue: "BULLMQ"
        },
        { status: 202 }
      );
    }

    const result = await executeCreateNextRelease({ actor, idempotencyKey });
    return NextResponse.json(
      {
        ok: true,
        created: result.created,
        workflowId: result.workflow.id,
        projectId: result.workflow.projectId,
        queue: result.workflow.queue
      },
      { status: 202 }
    );
  } catch (error) {
    return apiError(error);
  }
}
