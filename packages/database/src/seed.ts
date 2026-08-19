import { prisma } from "./client.ts";

const CANON = {
  version: "BLAIZE_CANON_v4.0",
  northStar: "BLAIZE SUNDAY looks expensive, feels weird, and tells the truth sideways.",
  visualRule: "Every image contains one beautiful thing and one wrong thing.",
  voiceName: "SUNDAY AFTER MIDNIGHT",
  safety: ["Never cruel", "Never misogynistic", "Never hateful", "Never imitate a living performer"]
};

const ROLES = [
  ["CMO-01", "Artist Operations Orchestrator", "control", "EXECUTABLE"],
  ["CMO-04", "Creative Director", "creation", "EXECUTABLE"],
  ["CMA-01", "Song Strategy Agent", "creation", "EXECUTABLE"],
  ["CMA-02", "Lyric Composer", "creation", "EXECUTABLE"],
  ["CMA-03", "Lyric Editor & Originality Reviewer", "evaluation", "EXECUTABLE"],
  ["CMO-05", "Quality Gatekeeper", "evaluation", "EXECUTABLE"],
  ["CMR-02", "Release Packager", "delivery", "EXECUTABLE"],
  ["CMR-05", "Platform Optimization Agent", "delivery", "PREPARE_ONLY"],
  ["CMO-03", "Voice Governor", "evaluation", "EXECUTABLE"],
  ["CMA-09", "Vocal Direction & Synthesis Agent", "creation", "EXECUTABLE"],
  ["CMA-10", "Vocal QA Agent", "evaluation", "EXECUTABLE"],
  ["CMA-14", "Audio QA Agent", "evaluation", "EXECUTABLE"],
  ["CMV-01", "Visual Continuity Director", "evaluation", "EXECUTABLE"],
  ["CMV-02", "Cover Art & Poster Designer", "creation", "EXECUTABLE"],
  ["CMK-01", "Asset Archivist", "knowledge", "EXECUTABLE"],
  ["CMK-03", "Rights & Provenance Recorder", "knowledge", "EXECUTABLE"],
  ["CMM-01", "Content Strategist", "creation", "EXECUTABLE"],
  ["CMM-02", "Copywriter & Social Voice Agent", "creation", "EXECUTABLE"],
  ["CMM-03", "Post Scheduler", "delivery", "EXECUTABLE"],
  ["CMM-05", "Community Triage Agent", "analysis", "EXECUTABLE"],
  ["CMR-01", "Release Calendar Manager", "control", "EXECUTABLE"],
  ["DAA-07", "AI Output Evaluator", "evaluation", "EXECUTABLE"],
  ["GKE-04", "Audit Evidence Curator", "knowledge", "EXECUTABLE"],
  ["GKE-06", "Research & Source Verification Agent", "knowledge", "EXECUTABLE"],
  ["RCP-08", "Partner Ecosystem Research Agent", "analysis", "EXECUTABLE"],
  ["RCP-04", "Proposal & RFP Response Agent", "creation", "EXECUTABLE"],
  ["DAA-08", "Decision Intelligence Agent", "analysis", "EXECUTABLE"],
  ["GKE-03", "Approval Steward", "control", "EXECUTABLE"],
  ["CMO-06", "Collaboration Coordinator", "control", "EXECUTABLE"],
  ["distribution_agent", "Distribution Agent", "delivery", "PREPARE_ONLY"],
  ["dsp_publishing_agent", "DSP Publishing Agent", "delivery", "PREPARE_ONLY"],
  ["youtube_agent", "YouTube Agent", "delivery", "PREPARE_ONLY"]
] as const;

async function main() {
  const artist = await prisma.artist.upsert({
    where: { slug: "blaize-sunday" },
    update: { canonVersion: CANON.version },
    create: {
      name: "BLAIZE SUNDAY",
      slug: "blaize-sunday",
      status: "ACTIVE",
      canonVersion: CANON.version
    }
  });

  await prisma.artistCanon.upsert({
    where: { artistId: artist.id },
    update: { version: CANON.version, canon: CANON },
    create: { artistId: artist.id, version: CANON.version, canon: CANON }
  });

  await prisma.voiceProfile.upsert({
    where: { artistId: artist.id },
    update: { verificationStatus: "UNCONFIGURED" },
    create: {
      artistId: artist.id,
      verificationStatus: "UNCONFIGURED",
      vocalSettings: { name: CANON.voiceName },
      approvedReferenceAssets: []
    }
  });

  for (const [id, name, category, implementationStatus] of ROLES) {
    await prisma.agent.upsert({
      where: { id },
      update: { name, category, roleId: id, implementationStatus },
      create: {
        id,
        name,
        category,
        description: `${name} for supervised BLAIZE SUNDAY operations.`,
        roleId: id,
        implementationStatus,
        active: true,
        autonomyLevel: "PREPARE_ONLY",
        runbook: {
          permittedActions: ["prepare", "validate", "log"],
          prohibitedActions: ["publish", "spend", "transfer rights", "buyer_contact"]
        }
      }
    });
  }

  const project = await prisma.songProject.upsert({
    where: { slug: "looks-expensive" },
    update: {},
    create: {
      artistId: artist.id,
      title: "LOOKS EXPENSIVE",
      workingTitle: "LOOKS EXPENSIVE",
      slug: "looks-expensive",
      state: "WRITING",
      strategicMove: "Manifesto single",
      canonVersion: CANON.version,
      autonomySource: "SEED"
    }
  });

  const lyricCount = await prisma.lyricVersion.count({ where: { projectId: project.id } });
  if (lyricCount === 0) {
    await prisma.lyricVersion.create({
      data: {
        projectId: project.id,
        version: 1,
        title: "LOOKS EXPENSIVE",
        fullLyrics: "I look expensive\neven when the night is cheap",
        structure: { chorus: "I look expensive" },
        hook: "I look expensive",
        captionLines: ["I look expensive"],
        createdByAgent: "CMA-02"
      }
    });
  }

  await prisma.releaseMetadata.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      title: "LOOKS EXPENSIVE",
      artistName: "BLAIZE SUNDAY",
      genre: "melodic trap",
      language: "en",
      explicit: false,
      credits: { primary: "BLAIZE SUNDAY" },
      tags: ["proof-cycle"],
      dspMetadata: {}
    }
  });

  await prisma.rightsRecord.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      ownership: { artist: "BLAIZE SUNDAY" },
      ownershipConfirmed: false,
      contributors: [],
      licenses: [],
      aiGenerationRecords: [],
      provenanceManifest: { complete: false },
      provenanceComplete: false,
      approved: false
    }
  });

  await prisma.release.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      artistId: artist.id,
      title: "LOOKS EXPENSIVE",
      status: "PREPARED",
      releaseType: "SINGLE"
    }
  });

  console.log("Seed complete: BLAIZE SUNDAY canon, role registry, LOOKS EXPENSIVE.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
