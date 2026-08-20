import test from "node:test";
import assert from "node:assert/strict";
import { captionTimelineFromWhisperJson } from "./whisper-alignment.ts";

test("whisper segment JSON becomes a normalized caption timeline", () => {
  const timeline = captionTimelineFromWhisperJson(
    {
      result: { language: "en" },
      transcription: [
        {
          timestamps: { from: "00:00:00,320", to: "00:00:03,760" },
          text: "  Tiny density fluctuations became the seeds.  "
        },
        {
          timestamps: { from: "00:00:03,760", to: "00:00:07,200" },
          text: "Dark matter supplied the gravitational scaffolding."
        }
      ]
    },
    "en"
  );

  assert.deepEqual(timeline, {
    locale: "en",
    cues: [
      {
        startSeconds: 0.32,
        endSeconds: 3.76,
        text: "Tiny density fluctuations became the seeds."
      },
      {
        startSeconds: 3.76,
        endSeconds: 7.2,
        text: "Dark matter supplied the gravitational scaffolding."
      }
    ]
  });
});

test("whisper JSON fails closed when segment timing is malformed", () => {
  assert.throws(
    () =>
      captionTimelineFromWhisperJson(
        {
          transcription: [
            {
              timestamps: { from: "not-a-time", to: "00:00:01,000" },
              text: "bad"
            }
          ]
        },
        "en"
      ),
    /INVALID_WHISPER_ALIGNMENT/
  );
});
