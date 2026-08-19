import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { designSundayAfterMidnightPreviews } from "./elevenlabs-design.ts";

const OUTPUT_DIR = resolve(
  process.env.VOICE_DESIGN_OUTPUT_DIR?.trim() || "artifacts/voice-design",
);

function extensionFor(mediaType: string): string {
  if (mediaType === "audio/mpeg" || mediaType === "audio/mp3") return "mp3";
  if (mediaType === "audio/wav" || mediaType === "audio/x-wav") return "wav";
  throw new Error(`UNSUPPORTED_VOICE_PREVIEW_MEDIA_TYPE:${mediaType}`);
}

async function main() {
  const result = await designSundayAfterMidnightPreviews();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const manifest = {
    identityId: "blaize-sunday/sunday-after-midnight",
    canonicalName: "SUNDAY AFTER MIDNIGHT",
    generatedAt: new Date().toISOString(),
    state: "VOICE_DESIGN_PREVIEW_SET / NOT_LOCKED / NOT_PERSISTED",
    provenance: result.provenance,
    previewText: result.previewText,
    voiceDescription: result.voiceDescription,
    previews: result.previews.map((preview, index) => ({
      candidate: `D${index + 1}`,
      generatedVoiceId: preview.generatedVoiceId,
      mediaType: preview.mediaType,
      durationSecs: preview.durationSecs,
      language: preview.language,
      filename: `SUNDAY_AFTER_MIDNIGHT_D${index + 1}.${extensionFor(preview.mediaType)}`,
    })),
  };

  for (const [index, preview] of result.previews.entries()) {
    const ext = extensionFor(preview.mediaType);
    const filename = `SUNDAY_AFTER_MIDNIGHT_D${index + 1}.${ext}`;
    await writeFile(
      resolve(OUTPUT_DIR, filename),
      Buffer.from(preview.audioBase64, "base64"),
    );
  }

  await writeFile(
    resolve(OUTPUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `Created ${result.previews.length} SUNDAY AFTER MIDNIGHT design previews in ${OUTPUT_DIR}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Voice design failed: ${message}\n`);
  process.exitCode = 1;
});
