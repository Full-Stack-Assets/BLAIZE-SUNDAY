import { NextRequest, NextResponse } from "next/server";
import { forgeVariation } from "@/lib/forge";
import type { SectionId } from "@/lib/types";
import { getServerApiKey, LlmConfigurationError, LlmProviderError, operatingMode } from "@songforge/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sectionId, currentText, title } = body as {
      sectionId: SectionId;
      currentText: string;
      title: string;
    };

    if (!sectionId || typeof currentText !== "string") {
      return NextResponse.json(
        { error: "sectionId and currentText required" },
        { status: 400 }
      );
    }

    const mode = operatingMode();
    if (mode === "test") {
      return NextResponse.json({
        source: "simulated",
        mode: "test",
        variations: forgeVariation(sectionId, currentText, title || "")
      });
    }

    const apiKey = getServerApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "BLOCKED_CONFIGURATION", source: "none" },
        { status: 503 }
      );
    }

    const variations = await callRemoteForge({
      apiKey,
      sectionId,
      currentText,
      title
    });
    return NextResponse.json({ source: "remote", mode: "live", variations });
  } catch (err) {
    const code =
      err instanceof LlmConfigurationError
        ? err.code
        : err instanceof LlmProviderError
          ? err.code
          : "BLOCKED_PROVIDER";
    return NextResponse.json({ ok: false, error: code, source: "none" }, { status: 502 });
  }
}

async function callRemoteForge({
  apiKey,
  sectionId,
  currentText,
  title
}: {
  apiKey: string;
  sectionId: string;
  currentText: string;
  title: string;
}) {
  const base = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const system = `You are Songforge for BLAIZE SUNDAY. Return JSON { "variations": [ { "label": string, "text": string, "note": string } ] }. Never imitate a living performer.`;
  const user = `Track: ${title}\nSection: ${sectionId}\nCurrent:\n${currentText || "(empty)"}`;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!res.ok) throw new LlmProviderError(`LLM_${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new LlmProviderError("EMPTY_LLM_RESPONSE");
  const parsed = JSON.parse(content) as {
    variations?: { label?: string; text?: string; note?: string }[];
  };
  return (parsed.variations || [])
    .map((v, i) => ({
      id: `remote-${Date.now()}-${i}`,
      label: v.label || `Take ${i + 1}`,
      text: v.text || "",
      note: v.note || "Remote forge"
    }))
    .filter((v) => v.text.trim());
}
