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

  await seedVideoFixtures();

  console.log("Seed complete: BLAIZE SUNDAY canon, role registry, LOOKS EXPENSIVE, and video regression fixtures.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
