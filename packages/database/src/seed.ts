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
        northStar: "BLAIZE SUNDAY looks expensive, feels weird, and tells the truth sideways.",
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

  console.log("Seed complete: BLAIZE SUNDAY canon and core agent registry.");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
