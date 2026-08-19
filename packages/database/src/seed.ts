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

const SUNDAY_AFTER_MIDNIGHT_B3 = {
  voiceIdentityId: "blaize-sunday/sunday-after-midnight",
  internalCandidate: "B3",
  provider: "heygen",
  providerVoiceId: "10863794b2454eaa8781f377939d6f14",
  providerAssetClass: "public",
  providerLibraryLabelObserved: "Gerardo - Lifelike",
  status: "G2_FINALIST",
  rights: {
    ownership: "NOT_OWNED",
    clonePermission: "UNKNOWN",
    commercialContinuity: "UNVERIFIED"
  },
  timbre: {
    register: "masculine low-mid",
    micPerspective: "intimate close-mic",
    cadence: "relaxed conversational",
    confidence: "dry, controlled",
    depth: "slightly deeper than original Candidate B",
    sibilants: "clean",
    lisp: "avoid audible lisp or smeared sibilants",
    breath: "controlled",
    emotionalBaseline: "guarded",
    accent: "contemporary American, not strongly regional"
  },
  antiTargets: [
    "radio-DJ baritone",
    "trailer narration",
    "exaggerated rasp",
    "cartoon swagger",
    "musical-theater diction",
    "glossy generic pop tenor",
    "over-bright or lispy sibilants",
    "imitation of a living performer"
  ],
  modes: {
    sundayTalk: {
      speed: 0.92,
      behavior: "dry, close, almost spoken, deadpan, clean diction"
    },
    blaizeMode: {
      speed: 1.08,
      behavior: "rhythm-forward, sharper attack, compact phrasing"
    },
    velvet: {
      speed: 0.86,
      behavior: "melodic extension target; restrained breathiness and falsetto; speech render is only a proxy"
    },
    zeroStatic: {
      speed: 0.78,
      behavior: "exposed, minimal theatricality; speech render is only a proxy"
    }
  },
  g2Thresholds: {
    aggregateSamePerformerRecognition: 0.7,
    minimumModePairRecognition: 0.6,
    minimumValidIndependentRaters: 12
  }
} as const;

const B3_REFERENCE_ASSETS = {
  diagnostic: {
    type: "SPOKEN_DIAGNOSTIC",
    url: "https://resource2.heygen.ai/text_to_speech/b0cbb3d7f0a549159794a8b3ba4a41ab/10863794b2454eaa8781f377939d6f14/id=55a92ff2-a617-407b-b998-0664ed296802.wav",
    verification: "EXACT_PROVIDER_VOICE_ID"
  },
  auditionScript: "Card declined, fit approved. I look certain, feel confused. Bad decisions, great outfit. I got good at looking certain long before I felt okay.",
  modeProxies: {
    sundayTalk: "https://resource2.heygen.ai/text_to_speech/b0cbb3d7f0a549159794a8b3ba4a41ab/10863794b2454eaa8781f377939d6f14/id=33f59716-c455-40f6-b4f5-e186d982d70e.wav",
    blaizeMode: "https://resource2.heygen.ai/text_to_speech/b0cbb3d7f0a549159794a8b3ba4a41ab/10863794b2454eaa8781f377939d6f14/id=5c1c9268-962a-45e3-b630-d2b9a86e6fca.wav",
    velvet: "https://resource2.heygen.ai/text_to_speech/b0cbb3d7f0a549159794a8b3ba4a41ab/10863794b2454eaa8781f377939d6f14/id=1ded3221-37e9-4034-8ee2-82c3f3524357.wav",
    zeroStatic: "https://resource2.heygen.ai/text_to_speech/b0cbb3d7f0a549159794a8b3ba4a41ab/10863794b2454eaa8781f377939d6f14/id=0ea954d8-d311-40ef-8923-c2a7cf5c26a0.wav"
  },
  singingDirection: {
    provider: "picsart/minimax-music-v3",
    generationHandle: "99cd90d2-3e81-4554-abee-b2c96f5fb526",
    url: "https://cdn-editing-temp.picsart.com/editing-temp/64e7a442-b745-4706-af23-eb943067d53a.mp3",
    verification: "MUSICAL_DIRECTION_ONLY_TIMBRE_NOT_VALIDATED"
  }
} as const;

async function main() {
  const artist = await prisma.artist.upsert({
    where: { slug: "blaize-sunday" },
    update: {
      name: "BLAIZE SUNDAY",
      status: "ACTIVE",
      canonVersion: "BLAIZE_CANON_v4.0"
    },
    create: {
      name: "BLAIZE SUNDAY",
      slug: "blaize-sunday",
      status: "ACTIVE",
      canonVersion: "BLAIZE_CANON_v4.0"
    }
  });

  await prisma.artistCanon.upsert({
    where: { artistId: artist.id },
    update: {
      version: "BLAIZE_CANON_v4.0"
    },
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

  await prisma.voiceProfile.upsert({
    where: { artistId: artist.id },
    update: {
      canonicalVoiceId: SUNDAY_AFTER_MIDNIGHT_B3.providerVoiceId,
      provider: SUNDAY_AFTER_MIDNIGHT_B3.provider,
      verificationStatus: SUNDAY_AFTER_MIDNIGHT_B3.status,
      vocalSettings: SUNDAY_AFTER_MIDNIGHT_B3,
      approvedReferenceAssets: B3_REFERENCE_ASSETS,
      consistencyThreshold: SUNDAY_AFTER_MIDNIGHT_B3.g2Thresholds.aggregateSamePerformerRecognition
    },
    create: {
      artistId: artist.id,
      canonicalVoiceId: SUNDAY_AFTER_MIDNIGHT_B3.providerVoiceId,
      provider: SUNDAY_AFTER_MIDNIGHT_B3.provider,
      verificationStatus: SUNDAY_AFTER_MIDNIGHT_B3.status,
      vocalSettings: SUNDAY_AFTER_MIDNIGHT_B3,
      approvedReferenceAssets: B3_REFERENCE_ASSETS,
      consistencyThreshold: SUNDAY_AFTER_MIDNIGHT_B3.g2Thresholds.aggregateSamePerformerRecognition
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

  console.log("Seed complete: BLAIZE SUNDAY canon, B3 voice finalist, and core agent registry.");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
