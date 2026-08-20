# BLAIZE SUNDAY — Visualizer & Lyric-Video Production System

**State:** `PRODUCTION_SPEC_COMPLETE / FINAL SYNCHRONIZED EXPORTS DEPEND ON APPROVED AUDIO`  
**Campaign rule:** one coherent visual grammar across ten songs, with track-specific system failures rather than unrelated templates.

## Shared visualizer grammar

- cinematic photorealistic BLAIZE identity imagery rather than generic waveform animations;
- 35–50mm visual language, deliberate negative space and slow camera movement;
- obsidian / bone / chrome / liquid amber / bruised-violet base palette, modulated per song;
- STATIC appears as brief narrative interference, never constant VHS noise;
- typography is clean, uppercase, compact and deliberately over-organized;
- one track-specific system object becomes a rhythmic transition device;
- no new fur imagery;
- any Bulls/Goyard branding is candidate-only until the rights decision.

## Typography and caption contract

- Primary family: modern grotesk / geometric sans with clean numerals; use repository-safe licensed or system font in final render.
- Main lyric line: maximum two lines at once in 9:16; no more than ~34 characters per line when possible.
- Word-by-word karaoke highlighting is optional and must not make the video resemble a template app.
- Safe zones: keep critical type clear of bottom 20% and top 10% in vertical delivery.
- Punctuation follows the locked lyric exactly.
- Spoken tags use a smaller mono/system font to distinguish interface dialogue from sung lyrics.
- Every final lyric video must be generated from a timecoded lyric/caption file derived from the exact approved audio master; approximate timing is not release evidence.

## Master output family per track

```text
VIDEO/
├── visualizer_master_16x9.mp4
├── visualizer_vertical_9x16.mp4
├── lyric_video_master_16x9.mp4
├── lyric_video_vertical_9x16.mp4
├── short_hook_01_9x16.mp4
├── captions_master.srt
├── captions_master.vtt
├── treatment.md
└── video_provenance.json
```

## Technical delivery target

- H.264 High Profile or equivalent broadly compatible delivery codec;
- 1920×1080 for 16:9 and 1080×1920 for 9:16 unless provider source requires a higher intermediate;
- constant frame rate 24 or 30 fps per approved campaign template, never mixed inside a deliverable;
- AAC 48 kHz audio for review copies; final distribution keeps the approved source master as the audio parent;
- no audio normalization that changes the approved master during video muxing;
- captions checked against locked lyrics and exact master duration;
- final files must decode cleanly and receive SHA-256 plus ffprobe receipt.

## Track visualizer treatments

### 01 LOOKS EXPENSIVE

Hotel corridor/check-out desk loop. Slow push toward BLAIZE, card reader red pulse only at structural transitions. A receipt line briefly replaces the horizon line, then snaps back. STATIC //001 can interrupt once with the wrong-house/open-house premise.

### 02 MY THERAPIST BLOCKED ME

Sterile waiting room loop with hold-line indicator, unoccupied second chair and check-in tablet. Tiny interface errors appear between sections. During the vulnerable bridge, remove most interface overlays and let the room stay still.

### 03 BAD DECISIONS, GREAT OUTFIT

Direct-flash nightlife/gas-station motion loop. Autofocus target hunts before downbeats, then locks on BLAIZE. Camera movement increases during chorus but never becomes generic club montage.

### 04 PRETTY BOY PROBLEMS

Fragrance studio, mirror and atomizer mist. Reflection drift is the single corrupted detail. Hook sections use clean mirrored symmetry; bridge lets the reflected expression diverge subtly.

### 05 DELETE AFTER LISTENING

High-rise kitchen/phone/empty chair. Visualizer behaves like one private voicemail slowly being erased. Deletion tone motif becomes a visual white-frame pulse; bridge strips almost all graphics.

### 06 NO SIGNAL

Parking-garage geometry and dead cellular bars. Sections lose and regain small pieces of the frame rather than applying full-screen glitch. Chorus widens spatially while the signal indicator disappears entirely.

### 07 2:17 AM

Hotel room, city bokeh, digital clock fixed at 2:17. Very slow movement, HVAC curtain motion and elevator glow. Minimal lyric typography floats at eye-line, not over the face.

### 08 PARALLEL YOU

Wet driveway/road fork with blue vehicles and impossible navigation arrows. Each chorus introduces a different path overlay; bridge removes navigation completely and shows only the real road.

### 09 ROOM SERVICE FOR ONE

Hotel cart and one place setting at a table designed for more. Receipt strip grows a little longer after each chorus. Camera remains formal and symmetrical while BLAIZE breaks the geometry.

### 10 WRONG FLOOR

Elevator corridor and vending machine. Floor display changes at section boundaries while room numbers remain inconsistent. Final chorus stops the display change for the first time.

## Audio-state handling

### Tracks 01–03

The visualizer/lyric-video design is ready for final synchronization **after Human Authority selects the exact archive-master candidate**. Until that selection, producing a final timed master would bind video to an unapproved audio parent and is therefore intentionally blocked by the master-approval gate.

### Tracks 04–10

Storyboard, motion design, lyric layout, caption segmentation and reusable scene loops may proceed now. Final synchronized visualizer/lyric-video masters remain `BLOCKED_SOURCE_MISSING` because the exact audio parent is not currently accessible. This is an audio evidence blocker, not a visual-production blocker.

## Final QA gate

A synchronized deliverable passes technical video QA only when:

1. the exact approved audio parent hash is recorded;
2. first and last frames decode without error;
3. video duration matches approved audio within container tolerance;
4. lyric text matches locked lyric with no missing/duplicated line;
5. BLAIZE identity continuity passes visual review;
6. no unapproved branded element dominates the frame;
7. captions are readable in 16:9 and 9:16 safe zones;
8. ffprobe properties and SHA-256 are recorded;
9. Human Authority approves the final visual master version.
