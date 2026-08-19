import { prisma } from "./client.ts";

const AGENTS = [
  ["artist_operations_orchestrator", "Artist Operations Orchestrator", "orchestration"],
  ["music_strategy_agent", "Music Strategy Agent", "strategy"],
  ["song_concept_agent", "Song Concept Agent", "creative"],
  ["songwriter_agent", "Songwriter Agent", "writing"],
  ["hook_specialist_agent", "Hook Specialist Agent", "writing"],
  ["lyric_editor_agent", "Lyric Editor Agent", "writing"],
  ["composition_agent", "Composition Agent", "music"],
  ["distribution_agent", "Distribution Agent", "distribution"],
  ["dsp_publishing_agent", "DSP Publishing Agent", "platform"],
  ["youtube_agent", "YouTube Agent", "platform"]
] as const;

async function seedVideoFixtures() {
  await prisma.videoGenerationRun.upsert({
    where: { id: "fixture-001-wisebase" },
    update: {},
    create: {
      id: "fixture-001-wisebase",
      lineageKey: "fixture-001-wisebase",
      version: 1,
      title: "Why Galaxies Form the Cosmic Web",
      topic: "Why galaxies form the cosmic web",
      mutation: "ROOT",
      brief: {
        benchmark: true,
        knownWeakness: "structure-first/mechanism-light"
      },
      briefHash: "historical-fixture-001",
      compiledConcept: "Why galaxies form the cosmic web",
      compiledExplanation: "Historical first Wisebase spike",
      promptHash: "historical-fixture-001",
      targetDurationSeconds: 60,
      status: "GENERATED",
      externalTaskId: "8008938a45804a02946a31b9c0d9bb62",
      externalStatus: "completed",
      providerMetrics: { totalDuration: 42.39 },
      durationSeconds: 34,
      width: 854,
      height: 480,
      fps: 15,
      captionStatus: "MISSING"
    }
  });

  await prisma.videoGenerationRun.upsert({
    where: { id: "fixture-002-wisebase-causal" },
    update: {},
    create: {
      id: "fixture-002-wisebase-causal",
      lineageKey: "fixture-002-wisebase-causal",
      version: 1,
      title: "Why Galaxies Form the Cosmic Web",
      topic: "Why galaxies form the cosmic web",
      mutation: "ROOT",
      brief: {
        benchmark: true,
        humanQualityState: "CURRENT_TARGET"
      },
      briefHash: "fixture-002-causal",
      compiledConcept: "Why Galaxies Form the Cosmic Web",
      compiledExplanation:
        "Causal prompt preserving primordial fluctuations, gravity, dark matter, anisotropic collapse, filaments, nodes and voids.",
      promptHash: "fixture-002-causal",
      targetDurationSeconds: 60,
      status: "CAPTIONS_REQUIRED",
      externalTaskId: "2ba4756ec0e744b3adfacdd208a745ae",
      externalStatus: "completed",
      videoUrl:
        "https://sider-pub.s3.amazonaws.com/manim/manim-6d0048a69e8a46bda9b389d9b15ef6e1.mp4",
      providerMetrics: {
        firstLlmDuration: 26.72,
        firstRenderDuration: 34.15,
        totalDuration: 60.88
      },
      providerError: {
        firstRenderError: null,
        secondRenderError: null,
        finalError: null
      },
      captionStatus: "MISSING"
    }
  });
}

async function main() {
  const artist = await prisma.artist.upsert({
    where: { slug: "blaize-sunday" },
    update: {},
    create: {
      name: "BLAIZE SUNDAY",
      slug: "blaize-sunday",
      status: "ACTIVE",
      canonVersion: "BLAIZE_CANON_v4.0"
    }
  });

  await prisma.artistCanon.upsert({
    where: { artistId: artist.id },
    update: {},
    create: {
      artistId: artist.id,
      version: "BLAIZE_CANON_v4.0",
      canon: {
        northStar:
          "BLAIZE SUNDAY looks expensive, feels weird, and tells the truth sideways.",
        visualRule: "Every image contains one beautiful thing and one wrong thing.",
        safety: [
          "Never cruel",
          "Never misogynistic",
          "Never hateful",
          "Never imitate a living performer"
        ]
      }
    }
  });

  for (const [id, name, category] of AGENTS) {
    await prisma.agent.upsert({
      where: { id },
      update: { name, category },
      create: {
        id,
        name,
        category,
        description: `${name} for supervised autonomous BLAIZE SUNDAY operations.`,
        active: true,
        autonomyLevel: "PREPARE_ONLY",
        runbook: {
          permittedActions: ["prepare", "validate", "log"],
          prohibitedActions: ["publish", "spend", "transfer rights"]
        }
      }
    });
  }

  await seedVideoFixtures();

  console.log(
    "Seed complete: BLAIZE SUNDAY canon, core agent registry, and video regression fixtures."
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
