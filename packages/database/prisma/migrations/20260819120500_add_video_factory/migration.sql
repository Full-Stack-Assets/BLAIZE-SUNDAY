-- CreateEnum
CREATE TYPE "VideoGenerationRunStatus" AS ENUM ('PLANNED', 'AWAITING_EXTERNAL_EXECUTION', 'PENDING', 'COMPLETED', 'GENERATED', 'CAPTIONS_REQUIRED', 'QC_FAILED', 'NEEDS_REVISION', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "VideoGenerationMutation" AS ENUM ('ROOT', 'REGENERATE', 'MORE_CINEMATIC', 'MORE_EXPLANATORY', 'SHORTER', 'LONGER');

-- CreateEnum
CREATE TYPE "VideoCaptionSource" AS ENUM ('PROVIDER_SIDECAR', 'LOCAL_ALIGNMENT', 'MANUAL_IMPORT');

-- CreateTable
CREATE TABLE "VideoGenerationRun" (
    "id" TEXT NOT NULL,
    "lineageKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "parentRunId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'WISEBASE',
    "connectorMode" TEXT NOT NULL DEFAULT 'CONNECTOR_MEDIATED',
    "mutation" "VideoGenerationMutation" NOT NULL DEFAULT 'ROOT',
    "brief" JSONB NOT NULL,
    "briefHash" TEXT NOT NULL,
    "compiledConcept" TEXT NOT NULL,
    "compiledExplanation" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "targetDurationSeconds" INTEGER NOT NULL,
    "durationTolerancePercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "status" "VideoGenerationRunStatus" NOT NULL DEFAULT 'PLANNED',
    "externalTaskId" TEXT,
    "externalStatus" TEXT,
    "videoUrl" TEXT,
    "providerMetrics" JSONB,
    "providerError" JSONB,
    "durationSeconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "fps" DOUBLE PRECISION,
    "captionStatus" TEXT NOT NULL DEFAULT 'MISSING',
    "qc" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoGenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCaptionAsset" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "source" "VideoCaptionSource" NOT NULL,
    "format" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "cueCount" INTEGER NOT NULL,
    "startSeconds" DOUBLE PRECISION NOT NULL,
    "endSeconds" DOUBLE PRECISION NOT NULL,
    "sourceMediaHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoCaptionAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoGenerationRun_externalTaskId_key" ON "VideoGenerationRun"("externalTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoGenerationRun_lineageKey_version_key" ON "VideoGenerationRun"("lineageKey", "version");

-- CreateIndex
CREATE INDEX "VideoGenerationRun_createdAt_idx" ON "VideoGenerationRun"("createdAt");

-- CreateIndex
CREATE INDEX "VideoGenerationRun_status_idx" ON "VideoGenerationRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoCaptionAsset_runId_version_format_key" ON "VideoCaptionAsset"("runId", "version", "format");

-- CreateIndex
CREATE INDEX "VideoCaptionAsset_runId_createdAt_idx" ON "VideoCaptionAsset"("runId", "createdAt");

-- AddForeignKey
ALTER TABLE "VideoGenerationRun" ADD CONSTRAINT "VideoGenerationRun_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "VideoGenerationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCaptionAsset" ADD CONSTRAINT "VideoCaptionAsset_runId_fkey" FOREIGN KEY ("runId") REFERENCES "VideoGenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
