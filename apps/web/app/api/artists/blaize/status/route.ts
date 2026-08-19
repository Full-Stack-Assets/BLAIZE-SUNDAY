import { prisma } from "@songforge/database";
import { inspectCanonicalVoice } from "@songforge/voice";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const artist = await prisma.artist.findUnique({
      where: { slug: "blaize-sunday" },
      include: {
        voiceProfile: true,
        projects: { orderBy: { createdAt: "desc" }, take: 8 },
        releases: { orderBy: { createdAt: "desc" }, take: 8 }
      }
    });
    if (!artist) {
      return NextResponse.json({ ok: false, error: "ARTIST_NOT_FOUND" }, { status: 404 });
    }
    const voice = inspectCanonicalVoice({
      providerVoiceId: artist.voiceProfile?.canonicalVoiceId,
      elevenLabsKey: process.env.ELEVENLABS_API_KEY
    });
    return NextResponse.json({
      ok: true,
      artist: {
        name: artist.name,
        slug: artist.slug,
        canonVersion: artist.canonVersion,
        voice,
        projectCount: artist.projects.length,
        releaseCount: artist.releases.length
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
