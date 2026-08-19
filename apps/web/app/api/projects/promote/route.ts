import { prisma } from "@songforge/database";
import { NextResponse } from "next/server";

import { apiError, readJsonObject, requiredString } from "@/lib/api";

/** Promote a Lab lyric draft into PostgreSQL. Does not advance release authorization. */
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const title = requiredString(body, "title");
    const lyrics = typeof body.lyrics === "string" ? body.lyrics : "";
    const artist = await prisma.artist.findUnique({ where: { slug: "blaize-sunday" } });
    if (!artist) {
      return NextResponse.json({ ok: false, error: "ARTIST_NOT_FOUND" }, { status: 404 });
    }
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    const project = await prisma.songProject.create({
      data: {
        artistId: artist.id,
        title,
        workingTitle: title,
        slug,
        state: "WRITING",
        canonVersion: "BLAIZE_CANON_v4.0",
        autonomySource: "LAB_PROMOTE",
        lyrics: lyrics
          ? {
              create: {
                version: 1,
                title,
                fullLyrics: lyrics,
                structure: {},
                captionLines: [],
                createdByAgent: "CMA-02"
              }
            }
          : undefined
      }
    });
    return NextResponse.json({ ok: true, projectId: project.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
