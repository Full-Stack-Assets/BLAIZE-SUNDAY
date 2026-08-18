import { randomUUID } from "node:crypto";

import { runCreateNextReleaseGraph, type HandoffEnvelope } from "@songforge/agents";
import { prisma } from "@songforge/database";
import { operatingMode } from "@songforge/llm";
import type { AgentRunStatus } from "@prisma/client";

function runStatus(envelope: HandoffEnvelope): AgentRunStatus {
  if (envelope.status === "BLOCKED" || envelope.status === "REJECTED") return "ESCALATED";
  if (envelope.status === "PLANNED" || envelope.status === "INTAKE") return "QUEUED";
  return "PASSED";
}

export async function executeCreateNextRelease(input: {
  idempotencyKey?: string;
  actor: string;
}) {
  const artist = await prisma.artist.findUnique({ where: { slug: "blaize-sunday" } });
  if (!artist) {
    const error = new Error("ARTIST_NOT_FOUND");
    throw error;
  }

  const idempotencyKey = input.idempotencyKey?.trim() || randomUUID();
  const existing = await prisma.workflowRun.findUnique({
    where: { idempotencyKey },
    include: { project: true, steps: true }
  });
  if (existing) {
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

  const project = await prisma.songProject.create({
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

  const lyricDraft = graph.steps.find((step) => step.roleId === "CMA-02")?.envelope.outputs[0]?.location;
  if (lyricDraft) {
    await prisma.lyricVersion.create({
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

  await prisma.release.create({
    data: {
      projectId: project.id,
      artistId: artist.id,
      title: graph.title,
      status: "PREPARED",
      releaseType: "SINGLE"
    }
  });

  const workflow = await prisma.workflowRun.create({
    data: {
      artistId: artist.id,
      projectId: project.id,
      command: "CREATE_NEXT_RELEASE",
      idempotencyKey,
      status: graph.status,
      mode: operatingMode(),
      queue: graph.queue,
      steps: {
        create: graph.steps.map((step) => ({
          roleId: step.roleId,
          status: step.envelope.status,
          envelope: step.envelope
        }))
      }
    },
    include: { steps: true, project: true }
  });

  for (const step of graph.steps) {
    await prisma.agentRun.create({
      data: {
        agentId: step.roleId,
        artistId: artist.id,
        projectId: project.id,
        status: runStatus(step.envelope),
        input: { command: "CREATE_NEXT_RELEASE", actor: input.actor },
        output: step.envelope,
        completedAt: new Date()
      }
    });
  }

  return { created: true, workflow };
}
