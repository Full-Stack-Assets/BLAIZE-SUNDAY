import { NextRequest, NextResponse } from "next/server";
import { forgeVariation } from "@/lib/forge";
import type { SectionId } from "@/lib/types";

/**
 * POST /api/forge
 *
 * Body: { sectionId, currentText, title }
 *
 * Tries a real model if OPENAI_API_KEY (or compatible) is present.
 * Falls back to the local Songforge engine so the UI never breaks.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sectionId, currentText, title, apiKey: bodyKey } = body as {
      sectionId: SectionId;
      currentText: string;
      title: string;
      apiKey?: string;
    };

    if (!sectionId || typeof currentText !== "string") {
      return NextResponse.json(
        { error: "sectionId and currentText required" },
        { status: 400 }
      );
    }

    // Priority: server env → request body key (local demo only)
    // Never log or persist the body key.
    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.GROK_API_KEY ||
      (typeof bodyKey === "string" ? bodyKey.trim() : "") ||
      "";

    if (apiKey) {
      try {
        const variations = await callRemoteForge({
          apiKey,
          sectionId,
          currentText,
          title,
        });
        if (variations?.length) {
          return NextResponse.json({
            source: "remote",
            variations,
          });
        }
      } catch (err) {
        console.warn("[forge] remote failed, falling back to local", err);
      }
    }

    // --- Local Songforge engine (always available) ---
    const variations = forgeVariation(sectionId, currentText, title || "");
    return NextResponse.json({
      source: "local",
      variations,
    });
  } catch (err) {
    console.error("[forge] error", err);
    return NextResponse.json(
      { error: "Forge failed" },
      { status: 500 }
    );
  }
}

async function callRemoteForge({
  apiKey,
  sectionId,
  currentText,
  title,
}: {
  apiKey: string;
  sectionId: string;
  currentText: string;
  title: string;
}) {
  // Minimal OpenAI-compatible call. Swap base URL for Grok/xAI when ready.
  const base =
    process.env.LLM_BASE_URL || "https://api.openai.com/v1";

  const system = `You are Songforge — Blaize's songwriting partner for BLAIZE SUNDAY.
Voice: thuggish/hood/rapper energy, melodic trap, dark storytelling, emotionally charged.
Rules:
- Return exactly 2 alternative versions of the given section.
- Keep the same emotional core and roughly the same length.
- Prefer concrete sensory imagery over abstract clichés.
- Protect internal rhyme and syllable density.
- Never write generic pop filler.
- Output valid JSON only: { "variations": [ { "label": string, "text": string, "note": string } ] }`;

  const user = `Track: ${title}
Section: ${sectionId}
Current lyrics:
"""
${currentText || "(empty)"}
"""

Give two stronger takes.`;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty LLM response");

  const parsed = JSON.parse(content);
  const variations = (parsed.variations || []).map(
    (v: any, i: number) => ({
      id: `remote-${Date.now()}-${i}`,
      label: v.label || `Take ${i + 1}`,
      text: v.text || "",
      note: v.note || "Remote forge",
    })
  );

  return variations.filter((v: any) => v.text.trim());
}
