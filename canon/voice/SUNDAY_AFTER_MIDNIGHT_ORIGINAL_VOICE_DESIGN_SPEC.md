# SUNDAY AFTER MIDNIGHT — Original Voice Design Contract

**Artist:** BLAIZE SUNDAY  
**Canonical identity:** `blaize-sunday/sunday-after-midnight`  
**Status:** `DESIGN_TARGET / NO OWNED ASSET YET`  
**Reference finalist:** B3  
**Reference provider asset:** HeyGen public voice `10863794b2454eaa8781f377939d6f14`  
**Purpose:** Create a rights-clean, persistent, original voice asset that preserves the approved B3 identity direction without copying or cloning the B3 provider voice.

## 1. Hard boundary

B3 is an audible **reference for attributes**, not training material.

Do not:
- upload B3 audio into a voice-cloning or speech-to-speech enrollment workflow;
- represent the B3 public provider voice as owned BLAIZE IP;
- transfer or re-register the B3 provider voice with another provider;
- use a provider's public/preset voice as the permanent production dependency unless contractual continuity is verified;
- approve a candidate merely because it is the closest available preset.

The production asset must be independently generated or recorded from a rights-cleared source and must have explicit commercial-use and continuity evidence.

## 2. Identity target

### Core timbre
- adult masculine voice;
- low-mid fundamental register;
- warm but not woolly;
- lightly textured, not raspy;
- intimate close-mic foreground;
- controlled breath noise;
- slightly dark spectral balance without radio-announcer bass;
- clean upper-mid articulation.

### Speech behavior
- relaxed conversational cadence;
- phrase onset is unhurried;
- timing can sit slightly behind the beat;
- dry, self-aware confidence;
- precision without sounding rehearsed;
- emotion leaks through restraint rather than volume;
- sentence endings may soften or drop rather than project.

### Articulation
- clean `s`, `z`, `sh`, `ch`, and `th`;
- no audible lisp;
- no smeared sibilants;
- consonants become sharper in rhythmic performance without becoming theatrical;
- vowels remain natural and contemporary American.

### Emotional range
The same identity must remain recognizable through:
- deadpan humor;
- flirtation;
- guarded confidence;
- embarrassment;
- exposed vulnerability;
- quiet regret;
- rhythmic assertion;
- restrained melodic intimacy.

## 3. Provider-neutral design prompt

> Create an original adult American male voice for a fictional recording artist. Low-mid masculine register, intimate close-mic presence, relaxed conversational cadence, dry confidence, lightly textured warmth, clean crisp sibilants with no lisp, controlled breathiness, and emotionally guarded delivery that can soften into precise vulnerability. The voice should feel contemporary, expensive, slightly strange, and naturally charismatic without sounding like a narrator. Timing may sit subtly behind the beat. Preserve clear consonants and smooth sustained vowels. Slight depth is desirable, but avoid radio bass, trailer narration, exaggerated rasp, theatrical diction, cartoon swagger, glossy generic pop-tenor brightness, or resemblance to any known performer.

This prompt describes **attributes only**. Do not attach B3 audio or use B3 as a cloning reference.

## 4. Four-mode acceptance contract

### SUNDAY TALK
- conversational and close;
- 0–20% performance intensity;
- minimal melodic motion;
- dry humor survives without exaggerated acting;
- intelligible sibilants at low volume.

### BLAIZE MODE
- 40–65% performance intensity;
- rhythm-forward phrase attack;
- compact endings;
- stronger consonants;
- melodic-rap capable;
- no identity drift toward a different, brighter speaker.

### VELVET
- 25–50% performance intensity;
- smooth sustained vowels;
- controlled breathiness;
- chest-to-mix transitions without abrupt timbral replacement;
- short restrained falsetto extension;
- intimate alternative R&B / electronic-pop behavior;
- no anonymous glossy tenor transformation.

### ZERO STATIC
- 5–25% performance intensity;
- nearly dry signal;
- exposed breaths and consonants remain natural;
- reduced swagger;
- vulnerability increases while speaker identity remains obvious;
- no melodrama or synthetic whisper artifact.

## 5. Singing capability requirements

A persistent production voice is not acceptable as BLAIZE until it passes all of these singing probes:

1. **Chest anchor:** sustain a comfortable low-mid vowel for 2–3 seconds without formant instability.
2. **Phrase glide:** move across a short 3–5 note melodic phrase while retaining the speaking identity.
3. **Rhythm-to-melody transition:** begin a line in BLAIZE MODE and finish melodically without speaker replacement.
4. **Mixed register:** reach a moderate upper note without sudden generic-tenor coloration.
5. **Falsetto touch:** one restrained short falsetto extension, immediately returning to the same core identity.
6. **Sibilant melody test:** sing a lyric containing repeated `s`, `sh`, `z`, and `th` sounds without lisping or splashy de-essing artifacts.
7. **Quiet emotional line:** perform a low-volume vulnerable phrase with audible detail and no whisper-model collapse.

## 6. Originality and rights evidence

For every proposed persistent candidate, record:

```yaml
voice_asset_id: null
provider: null
provider_asset_class: null
source_method: designed_original | rights_cleared_human | owned_synthetic_source
source_audio_hashes: []
training_reference_audio: []
commercial_use_verified: false
commercial_use_evidence: null
clone_or_derivative_permission: false
provider_continuity_verified: false
export_or_migration_rights: unknown
created_at: null
approved_by: null
```

`training_reference_audio` must remain empty for B3. If a human source is ever used, consent and commercial derivative rights must be explicit and versioned.

## 7. Candidate protocol

When a rights-clean Voice Design implementation becomes available:

1. Generate exactly **3 original candidates** from this design contract using independent seeds.
2. Do not reveal provider labels or seed numbers during selection.
3. Render the canonical audition text in all four modes.
4. Render the seven singing probes for each candidate.
5. Loudness-normalize the comparison assets.
6. Blind-randomize them independently from the old A/B3/C reference packet.
7. Compare each candidate against the B3 **attribute contract**, not by waveform or voice-clone similarity.
8. Reject all three if none satisfies the identity and singing requirements.
9. After one candidate survives, verify rights, persistence, and commercial continuity before G2 lock.

## 8. Migration rule

The canonical application alias remains:

`blaize-sunday/sunday-after-midnight`

The runtime may change the provider backing that alias only through a versioned identity migration event. Silent fallback is prohibited.

A future owned candidate should be registered as a new immutable asset version, for example:

`SUNDAY_AFTER_MIDNIGHT_OWNED_v1`

B3 remains historical reference evidence and must not be overwritten or relabeled as that owned asset.

## 9. Current state

```yaml
b3_reference_selected: true
musical_direction_explored: true
exact_b3_singing_validated: false
original_voice_design_contract: complete
owned_persistent_voice_asset: false
rights_gate: open
persistence_gate: open
singing_identity_gate: open
g2_lock: false
```

The next acceptable production milestone is a **rights-clean original voice-design candidate set**, not another public preset search.
