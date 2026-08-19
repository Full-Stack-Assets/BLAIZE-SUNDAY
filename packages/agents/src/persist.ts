import { randomUUID } from "node:crypto";

import type { AgentRunStatus, Prisma } from "@prisma/client";
import { prisma } from "@songforge/database";
import { operatingMode } from "@songforge/llm";

import type { HandoffEnvelope } from "./envelope.ts";
import { runCreateNextReleaseGraph } from "./orchestrator.ts";

function runStatus(envelope: HandoffEnvelope): AgentRunStatus {
  if (envelope.status === "BLOCKED" || envelope.status === "REJECTED") return "ESCALATED";
  if (envelope.status === "PLANNED" || envelope.status === "INTAKE") return "QUEUED";
  return "PASSED";
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isUniqueConstraintViolation(error: unknown): error is { code: "P2002" } {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002"
  );
}

export async function queueCreateNextRelease(input: {
  actor: string;
  idempotencyKey?: string;
}) {
  void input.actor;
  const artist = await requireArtist();
  const idempotencyKey = input.idempotencyKey?.trim() || randomUUID();
  const existing = await prisma.workflowRun.findUnique({
    where: { idempotencyKey },
    include: { project: true, steps: true }
  });
  if (existing) return { created: false, queued: existing.status === "QUEUED", workflow: existing };

  try {
    const workflow = await prisma.workflowRun.create({
      data: {
        artistId: artist.id,
        command: "CREATE_NEXT_RELEASE",
        idempotencyKey,
        status: "QUEUED",
        mode: operatingMode(),
        queue: "BULLMQ_PENDING"
      },
      include: { project: true, steps: true }
    });
    return { created: true, queued: true, workflow };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      const raced = await prisma.workflowRun.findUnique({
        where: { idempotencyKey },
        include: { project: true, steps: true }
      });
      if (raced) {
        return { created: false, queued: raced.status === "QUEUED", workflow: raced };
      }
    }
    throw error;
  }
}

export async function markWorkflowEnqueued(workflowId: string) {
  return prisma.workflowRun.update({
    where: { id: workflowId },
    data: { queue: "BULLMQ" }
  });
}

export async function executeCreateNextRelease(input: {
  idempotencyKey?: string;
  actor: string;
}) {
  const artist = await requireArtist();
  const idempotencyKey = input.idempotencyKey?.trim() || randomUUID();
  const existing = await prisma.workflowRun.findUnique({
    where: { idempotencyKey },
    include: { project: true, steps: true }
  });
  if (existing && existing.status !== "QUEUED") {
    return { created: false, workflow: existing };
  }

  const titles = (
    await prisma.songProject.findMany({
      where: { artistId: artist.id },
      select: { title: true }
    })
  )
    .map((row) => row.title)
    .filter((title): title is string => Boolean(title));

  const graph = runCreateNextReleaseGraph({
    artistId: artist.id,
    idempotencyKey,
    mode: operatingMode(),
    existingTitles: titles
  });

  try {
    const workflow = await prisma.$transaction(async (tx) => {
      const project = await tx.songProject.create({
        data: {
          artistId: artist.id,
          title: graph.title,
          workingTitle: graph.title,
          slug: `${graph.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idempotencyKey.slice(0, 8)}`,
          state: "STRATEGY",
          strategicMove: "CREATE NEXT RELEASE",
          canonVersion: "BLAIZE_CANON_v4.0",
          autonomySource: "AI_DECIDES",
          concept: { state: "AI_DECIDES" }
        }
      });

      const lyricDraft = graph.steps.find((step) => step.roleId === "CMA-02")?.envelope.outputs[0]
        ?.location;
      if (lyricDraft) {
        await tx.lyricVersion.create({
          data: {
            projectId: project.id,
            version: 1,
            title: graph.title,
            fullLyrics: lyricDraft,
            structure: {},
            captionLines: [],
            createdByAgent: "CMA-02"
          }
        });
      }

      await tx.release.create({
        data: {
          projectId: project.id,
          artistId: artist.id,
          title: graph.title,
          status: "PREPARED",
          releaseType: "SINGLE"
        }
      });

      const stepRows = graph.steps.map((step) => ({
        roleId: step.roleId,
        status: step.envelope.status,
        envelope: asJson(step.envelope)
      }));

      const saved = existing
        ? await tx.workflowRun.update({
            where: { id: existing.id },
            data: {
              projectId: project.id,
              status: graph.status,
              mode: operatingMode(),
              queue: process.env.REDIS_URL ? "BULLMQ" : "INLINE_UNCONFIGURED",
              steps: { create: stepRows }
            },
            include: { steps: true, project: true }
          })
        : await tx.workflowRun.create({
            data: {
              artistId: artist.id,
              projectId: project.id,
              command: "CREATE_NEXT_RELEASE",
              idempotencyKey,
              status: graph.status,
              mode: operatingMode(),
              queue: process.env.REDIS_URL ? "BULLMQ" : "INLINE_UNCONFIGURED",
              steps: { create: stepRows }
            },
            include: { steps: true, project: true }
          });

      for (const step of graph.steps) {
        await tx.agentRun.create({
          data: {
            agentId: step.roleId,
            artistId: artist.id,
            projectId: project.id,
            status: runStatus(step.envelope),
            input: asJson({ command: "CREATE_NEXT_RELEASE", actor: input.actor }),
            output: asJson(step.envelope),
            completedAt: new Date()
          }
        });
      }

      return saved;
    });

    return { created: true, workflow };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      const raced = await prisma.workflowRun.findUnique({
        where: { idempotencyKey },
        include: { project: true, steps: true }
      });
      if (raced) return { created: false, workflow: raced };
    }
    throw error;
  }
}

async function requireArtist() {
  const artist = await prisma.artist.findUnique({ where: { slug: "blaize-sunday" } });
  if (!artist) throw new Error("ARTIST_NOT_FOUND");
  return artist;
}
