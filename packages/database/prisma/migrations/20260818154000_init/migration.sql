-- CreateEnum
CREATE TYPE "ProjectState" AS ENUM ('IDEA', 'STRATEGY', 'WRITING', 'PRODUCTION', 'VOCALS', 'MIXING', 'MASTERING', 'SELECTED', 'QA', 'ASSET_GENERATION', 'METADATA', 'DISTRIBUTION_READY', 'APPROVAL', 'SCHEDULED', 'RELEASED', 'MONETIZING', 'ANALYZED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AudioAssetType" AS ENUM ('DEMO', 'VOCAL', 'INSTRUMENTAL', 'MIX', 'MASTER', 'STEM', 'ACAPELLA', 'PREVIEW', 'SPOKEN_DROP');

-- CreateEnum
CREATE TYPE "VisualAssetType" AS ENUM ('COVER_ART', 'COVER_VARIANT', 'THUMBNAIL', 'PROMOTIONAL_STILL', 'BANNER', 'SOCIAL_POST', 'BEHIND_THE_SONG');

-- CreateEnum
CREATE TYPE "VideoAssetType" AS ENUM ('VISUALIZER', 'LYRIC_VIDEO', 'MUSIC_VIDEO_CONCEPT', 'SHORT', 'REEL', 'TIKTOK', 'TEASER', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('PREPARED', 'AWAITING_AUTHORIZATION', 'SUBMITTED', 'ACCEPTED', 'SCHEDULED', 'LIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'RETRYING', 'ESCALATED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "canonVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistCanon" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "canon" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistCanon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "canonicalVoiceId" TEXT,
    "provider" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNCONFIGURED',
    "vocalSettings" JSONB NOT NULL,
    "approvedReferenceAssets" JSONB NOT NULL,
    "consistencyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongProject" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT,
    "workingTitle" TEXT,
    "slug" TEXT,
    "state" "ProjectState" NOT NULL DEFAULT 'IDEA',
    "strategicMove" TEXT,
    "creativeRationale" TEXT,
    "concept" JSONB,
    "theme" JSONB,
    "genre" JSONB,
    "mood" JSONB,
    "tempo" JSONB,
    "songStructure" JSONB,
    "hook" JSONB,
    "canonVersion" TEXT NOT NULL,
    "autonomySource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LyricVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT,
    "fullLyrics" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "hook" TEXT,
    "captionLines" JSONB NOT NULL,
    "canonScore" DOUBLE PRECISION,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdByAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LyricVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "AudioAssetType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "sampleRate" INTEGER,
    "bitDepth" INTEGER,
    "loudnessLufs" DOUBLE PRECISION,
    "voiceIdUsed" TEXT,
    "voiceConsistency" DOUBLE PRECISION,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "generationSettings" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisualAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "VisualAssetType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "prompt" TEXT,
    "canonScore" DOUBLE PRECISION,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "VideoAssetType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "platformTarget" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'PREPARED',
    "releaseType" TEXT NOT NULL DEFAULT 'SINGLE',
    "proposedReleaseDate" TIMESTAMP(3),
    "scheduledReleaseDate" TIMESTAMP(3),
    "liveDate" TIMESTAMP(3),
    "distributor" TEXT,
    "verifiedPlatformUrl" TEXT,
    "externalConfirmationId" TEXT,
    "platformUrls" JSONB,
    "submissionPackage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseMetadata" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "version" TEXT,
    "genre" TEXT NOT NULL,
    "subgenre" TEXT,
    "language" TEXT NOT NULL,
    "explicit" BOOLEAN NOT NULL,
    "isrc" TEXT,
    "upc" TEXT,
    "credits" JSONB NOT NULL,
    "description" TEXT,
    "tags" JSONB NOT NULL,
    "youtubeTitle" TEXT,
    "youtubeDesc" TEXT,
    "dspMetadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RightsRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownership" JSONB NOT NULL,
    "ownershipConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "contributors" JSONB NOT NULL,
    "licenses" JSONB NOT NULL,
    "aiGenerationRecords" JSONB NOT NULL,
    "provenanceManifest" JSONB NOT NULL,
    "provenanceComplete" BOOLEAN NOT NULL DEFAULT false,
    "rightsWarnings" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RightsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "releaseId" TEXT,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionRequest" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RevisionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseActionPackage" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "provider" TEXT,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseActionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseEvent" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" "DistributionStatus",
    "toStatus" "DistributionStatus",
    "actor" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalActionReceipt" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "externalConfirmationId" TEXT NOT NULL,
    "verifiedPlatformUrl" TEXT,
    "rawReceipt" JSONB NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalActionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "riskTier" TEXT NOT NULL DEFAULT 'moderate',
    "implementationStatus" TEXT NOT NULL DEFAULT 'UNIMPLEMENTED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "autonomyLevel" TEXT NOT NULL,
    "skills" JSONB,
    "integrations" JSONB,
    "runbook" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "artistId" TEXT,
    "projectId" TEXT,
    "status" "AgentRunStatus" NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDecision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "agentId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT,
    "canonVersion" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "generator" TEXT NOT NULL,
    "prompt" TEXT,
    "parameters" JSONB NOT NULL,
    "outputAssetId" TEXT,
    "outputSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalRef" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "projectId" TEXT,
    "command" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "envelope" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "capabilities" JSONB NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" TEXT,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistCanon_artistId_key" ON "ArtistCanon"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceProfile_artistId_key" ON "VoiceProfile"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "SongProject_slug_key" ON "SongProject"("slug");

-- CreateIndex
CREATE INDEX "SongProject_artistId_createdAt_idx" ON "SongProject"("artistId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LyricVersion_projectId_version_key" ON "LyricVersion"("projectId", "version");

-- CreateIndex
CREATE INDEX "AudioAsset_projectId_type_approved_idx" ON "AudioAsset"("projectId", "type", "approved");

-- CreateIndex
CREATE INDEX "VisualAsset_projectId_type_approved_idx" ON "VisualAsset"("projectId", "type", "approved");

-- CreateIndex
CREATE UNIQUE INDEX "Release_projectId_key" ON "Release"("projectId");

-- CreateIndex
CREATE INDEX "Release_artistId_createdAt_idx" ON "Release"("artistId", "createdAt");

-- CreateIndex
CREATE INDEX "Release_status_idx" ON "Release"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseMetadata_projectId_key" ON "ReleaseMetadata"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RightsRecord_projectId_key" ON "RightsRecord"("projectId");

-- CreateIndex
CREATE INDEX "Approval_releaseId_status_idx" ON "Approval"("releaseId", "status");

-- CreateIndex
CREATE INDEX "Approval_payloadHash_idx" ON "Approval"("payloadHash");

-- CreateIndex
CREATE INDEX "RevisionRequest_releaseId_status_idx" ON "RevisionRequest"("releaseId", "status");

-- CreateIndex
CREATE INDEX "ReleaseActionPackage_releaseId_actionType_createdAt_idx" ON "ReleaseActionPackage"("releaseId", "actionType", "createdAt");

-- CreateIndex
CREATE INDEX "ReleaseActionPackage_payloadHash_idx" ON "ReleaseActionPackage"("payloadHash");

-- CreateIndex
CREATE INDEX "ReleaseEvent_releaseId_createdAt_idx" ON "ReleaseEvent"("releaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalActionReceipt_releaseId_actionType_idx" ON "ExternalActionReceipt"("releaseId", "actionType");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalActionReceipt_provider_actionType_externalConfirmat_key" ON "ExternalActionReceipt"("provider", "actionType", "externalConfirmationId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_roleId_key" ON "Agent"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRun_idempotencyKey_key" ON "WorkflowRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WorkflowRun_artistId_createdAt_idx" ON "WorkflowRun"("artistId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_startedAt_idx" ON "WorkflowStep"("workflowId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_provider_key" ON "IntegrationConnection"("provider");

-- AddForeignKey
ALTER TABLE "ArtistCanon" ADD CONSTRAINT "ArtistCanon_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongProject" ADD CONSTRAINT "SongProject_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LyricVersion" ADD CONSTRAINT "LyricVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualAsset" ADD CONSTRAINT "VisualAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseMetadata" ADD CONSTRAINT "ReleaseMetadata_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RightsRecord" ADD CONSTRAINT "RightsRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseActionPackage" ADD CONSTRAINT "ReleaseActionPackage_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseEvent" ADD CONSTRAINT "ReleaseEvent_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalActionReceipt" ADD CONSTRAINT "ExternalActionReceipt_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDecision" ADD CONSTRAINT "AgentDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationHistory" ADD CONSTRAINT "GenerationHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEvent" ADD CONSTRAINT "RevenueEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SongProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

