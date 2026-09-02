import { prisma } from "@songforge/database";
import type { RouteNoteExecutionStep } from "@songforge/integrations";

import type {
  RouteNoteRunCreateInput,
  RouteNoteRunRecord,
  RouteNoteRunStatus,
  RouteNoteRunStore
} from "./routenote-run.server.ts";
import type { RouteNoteDraftSummary } from "./routenote-control.ts";

const QUEUE = "routenote-drafts";
const ROLE = "routenote-draft";

type StoredEnvelope = {
  releaseId: string;
  releaseTitle: string;
  actionPackageId: string;
  approvalId: string;
  payloadHash: string;
  currentStep: RouteNoteExecutionStep | null;
  completedSteps: RouteNoteExecutionStep[];
  errorCode: string | null;
  draft: RouteNoteDraftSummary | null;
};

type WorkflowWithSteps = Awaited<ReturnType<typeof prisma.workflowRun.findFirst>> & {
  steps?: Array<{
    envelope: unknown;
    status: string;
    error: string | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeStep(value: unknown): RouteNoteExecutionStep | null {
  return typeof value === "string" ? (value as RouteNoteExecutionStep) : null;
}

function decodeEnvelope(value: unknown): StoredEnvelope | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.releaseId !== "string" ||
    typeof value.releaseTitle !== "string" ||
    typeof value.actionPackageId !== "string" ||
    typeof value.approvalId !== "string" ||
    typeof value.payloadHash !== "string"
  ) return null;

  const completedSteps = Array.isArray(value.completedSteps)
    ? value.completedSteps.map(decodeStep).filter((step): step is RouteNoteExecutionStep => step !== null)
    : [];

  return {
    releaseId: value.releaseId,
    releaseTitle: value.releaseTitle,
    actionPackageId: value.actionPackageId,
    approvalId: value.approvalId,
    payloadHash: value.payloadHash,
    currentStep: decodeStep(value.currentStep),
    completedSteps,
    errorCode: typeof value.errorCode === "string" ? value.errorCode : null,
    draft: isRecord(value.draft) ? (value.draft as unknown as RouteNoteDraftSummary) : null
  };
}

function encodeEnvelope(input: Omit<StoredEnvelope, "currentStep" | "completedSteps" | "errorCode" | "draft">): StoredEnvelope {
  return {
    ...input,
    currentStep: null,
    completedSteps: [],
    errorCode: null,
    draft: null
  };
}

function mapRun(workflow: any): RouteNoteRunRecord {
  const step = Array.isArray(workflow.steps) ? workflow.steps[0] : null;
  const envelope = decodeEnvelope(step?.envelope);
  if (!envelope) throw new Error("ROUTENOTE_RUN_ENVELOPE_INVALID");

  return {
    id: workflow.id,
    idempotencyKey: workflow.idempotencyKey,
    releaseId: envelope.releaseId,
    releaseTitle: envelope.releaseTitle,
    projectId: workflow.projectId ?? "",
    artistId: workflow.artistId,
    actionPackageId: envelope.actionPackageId,
    approvalId: envelope.approvalId,
    payloadHash: envelope.payloadHash,
    status: workflow.status as RouteNoteRunStatus,
    currentStep: envelope.currentStep,
    completedSteps: envelope.completedSteps,
    errorCode: envelope.errorCode,
    draft: envelope.draft,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt
  };
}

async function workflowById(id: string) {
  return prisma.workflowRun.findUnique({
    where: { id },
    include: { steps: { where: { roleId: ROLE }, orderBy: { startedAt: "asc" }, take: 1 } }
  });
}

async function updateEnvelope(
  id: string,
  mutate: (envelope: StoredEnvelope) => StoredEnvelope,
  runStatus: RouteNoteRunStatus,
  stepStatus: string,
  error: string | null = null,
  completedAt: Date | null = null
) {
  const workflow = await workflowById(id);
  if (!workflow) throw new Error("ROUTENOTE_RUN_NOT_FOUND");
  const step = workflow.steps[0];
  const envelope = decodeEnvelope(step?.envelope);
  if (!step || !envelope) throw new Error("ROUTENOTE_RUN_ENVELOPE_INVALID");
  const next = mutate(envelope);

  await prisma.$transaction([
    prisma.workflowRun.update({
      where: { id },
      data: { status: runStatus }
    }),
    prisma.workflowStep.update({
      where: { id: step.id },
      data: {
        status: stepStatus,
        envelope: next as any,
        error,
        completedAt
      }
    })
  ]);
}

export class PrismaRouteNoteRunStore implements RouteNoteRunStore {
  async createOrGet(input: RouteNoteRunCreateInput): Promise<RouteNoteRunRecord> {
    const envelope = encodeEnvelope({
      releaseId: input.releaseId,
      releaseTitle: input.releaseTitle,
      actionPackageId: input.actionPackageId,
      approvalId: input.approvalId,
      payloadHash: input.payloadHash
    });

    const workflow = await prisma.workflowRun.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: {},
      create: {
        artistId: input.artistId,
        projectId: input.projectId,
        command: "ROUTENOTE_DRAFT",
        idempotencyKey: input.idempotencyKey,
        status: "QUEUED",
        mode: "DRAFT_ONLY",
        queue: QUEUE,
        steps: {
          create: {
            roleId: ROLE,
            status: "QUEUED",
            envelope: envelope as any
          }
        }
      },
      include: { steps: { where: { roleId: ROLE }, orderBy: { startedAt: "asc" }, take: 1 } }
    });

    return mapRun(workflow);
  }

  async get(id: string): Promise<RouteNoteRunRecord | null> {
    const workflow = await workflowById(id);
    return workflow ? mapRun(workflow) : null;
  }

  async latestForRelease(releaseId: string): Promise<RouteNoteRunRecord | null> {
    const workflows = await prisma.workflowRun.findMany({
      where: { queue: QUEUE, command: "ROUTENOTE_DRAFT" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { steps: { where: { roleId: ROLE }, orderBy: { startedAt: "asc" }, take: 1 } }
    });
    for (const workflow of workflows) {
      const envelope = decodeEnvelope(workflow.steps[0]?.envelope);
      if (envelope?.releaseId === releaseId) return mapRun(workflow);
    }
    return null;
  }

  async claimNextQueued(): Promise<RouteNoteRunRecord | null> {
    const candidate = await prisma.workflowRun.findFirst({
      where: { queue: QUEUE, command: "ROUTENOTE_DRAFT", status: "QUEUED" },
      orderBy: { createdAt: "asc" }
    });
    if (!candidate) return null;

    const claimed = await prisma.workflowRun.updateMany({
      where: { id: candidate.id, status: "QUEUED" },
      data: { status: "RUNNING" }
    });
    if (claimed.count !== 1) return null;

    await prisma.workflowStep.updateMany({
      where: { workflowId: candidate.id, roleId: ROLE, status: "QUEUED" },
      data: { status: "RUNNING", error: null }
    });
    return this.get(candidate.id);
  }

  async updateProgress(id: string, completedSteps: RouteNoteExecutionStep[]): Promise<void> {
    await updateEnvelope(
      id,
      envelope => ({
        ...envelope,
        completedSteps: [...completedSteps],
        currentStep: completedSteps.at(-1) ?? null,
        errorCode: null
      }),
      "RUNNING",
      "RUNNING"
    );
  }

  async complete(id: string, draft: RouteNoteDraftSummary): Promise<void> {
    const completedAt = new Date();
    await updateEnvelope(
      id,
      envelope => ({
        ...envelope,
        completedSteps: [...draft.completedSteps],
        currentStep: draft.completedSteps.at(-1) ?? null,
        errorCode: null,
        draft: structuredClone(draft)
      }),
      "DRAFT_READY",
      "DRAFT_READY",
      null,
      completedAt
    );
  }

  async fail(id: string, errorCode: string, blocked: boolean): Promise<void> {
    const status: RouteNoteRunStatus = blocked ? "BLOCKED_OPERATOR_REVIEW" : "FAILED";
    await updateEnvelope(
      id,
      envelope => ({ ...envelope, errorCode }),
      status,
      status,
      errorCode,
      new Date()
    );
  }

  async recoverInterrupted(): Promise<number> {
    const interrupted = await prisma.workflowRun.findMany({
      where: { queue: QUEUE, command: "ROUTENOTE_DRAFT", status: "RUNNING" },
      select: { id: true }
    });
    for (const item of interrupted) {
      await this.fail(item.id, "ROUTENOTE_RUN_INTERRUPTED", true);
    }
    return interrupted.length;
  }
}
