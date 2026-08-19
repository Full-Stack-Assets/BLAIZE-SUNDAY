# SUNDAY AFTER MIDNIGHT — B3 Voice Finalist Contract

**Artist:** BLAIZE SUNDAY  
**Canonical voice identity:** SUNDAY AFTER MIDNIGHT  
**Record type:** Voice finalist / G2 evidence artifact  
**Status:** `G2_FINALIST / NOT_LOCKED`  
**Recorded:** 2026-08-19  
**Authority:** Artist Principal selected B3 as the best refinement from the B-series audition.  
**Canonical parent:** `BLAIZE_SUNDAY_FULL_MASTER_v4.md`, Part I §4 Voice Bible.

---

## 1. Decision

B3 is the current preferred timbral candidate for BLAIZE SUNDAY's **SUNDAY AFTER MIDNIGHT** core voice.

The Artist Principal's selection path was:

1. Initial three-candidate audition across SUNDAY TALK, BLAIZE MODE, VELVET, and ZERO STATIC.
2. Candidate B selected as the strongest identity anchor.
3. Requested refinement: **slightly deeper, with cleaner sibilants and less audible lisp, while preserving B's relaxed intimate character**.
4. Three B-refinements generated.
5. **B3 selected as the best iteration.**

This is a human identity preference decision, not yet a completed G2 lock.

---

## 2. Exact Provider Anchor

| Field | Value |
|---|---|
| Provider | HeyGen |
| Provider asset type | Public Starfish-compatible voice |
| Provider voice ID | `10863794b2454eaa8781f377939d6f14` |
| Provider library label observed during audition | `Gerardo - Lifelike` |
| Internal candidate name | `B3` |
| Canonical target name | `SUNDAY AFTER MIDNIGHT` |
| Ownership state | **NOT OWNED / PUBLIC PROVIDER ASSET** |
| Clone permission state | **NOT ESTABLISHED** |
| Persistence guarantee | Provider ID is addressable now; long-term provider availability is not guaranteed. |

**Critical boundary:** B3 may serve as the current audible reference and implementation anchor, but it must not be represented as an owned proprietary BLAIZE voice clone unless an independently rights-cleared persistent voice asset is created and approved.

---

## 3. Timbral Target Derived From B3

The selected direction is:

- masculine low-mid register;
- intimate, close-mic foreground;
- relaxed conversational cadence;
- dry confidence rather than announcer projection;
- slightly deeper than the original Candidate B reference;
- clean `s`, `z`, `sh`, `ch`, and `th` articulation;
- no obvious lisp or smeared sibilants;
- controlled breath texture;
- emotionally guarded baseline;
- capable of precise vulnerability without theatricality;
- contemporary American presentation without a strongly regional accent;
- no deliberate resemblance to a named living performer.

### Anti-targets

Do not drift toward:

- radio-DJ baritone;
- trailer narration;
- exaggerated rasp;
- cartoon swagger;
- musical-theater diction;
- glossy generic pop tenor;
- exaggerated vocal fry;
- over-bright or lispy sibilants;
- affectations that make the voice sound intentionally “AI cool.”

---

## 4. Canonical Performance Modes

B3 is the identity anchor. The modes are performance states of one voice, not alternate speakers.

### SUNDAY TALK

- dry and close;
- almost spoken;
- slightly behind conversational tempo;
- minimal pitch movement;
- deadpan observations and flirtation;
- clean diction without sounding rehearsed.

### BLAIZE MODE

- rhythm-forward;
- sharper attack and consonants;
- compact phrase endings;
- controlled melodic-rap pressure;
- swagger comes from timing, not forced depth.

### VELVET

- melodic extension of the same identity;
- restrained breathiness;
- smooth sustained vowels;
- limited, controlled falsetto rather than a separate tenor identity;
- intimate R&B/electronic-pop lift;
- avoid anonymous glossy vocal production.

### ZERO STATIC

- nearly exposed vocal;
- minimal processing;
- reduced ad-libs;
- emotionally specific;
- no melodrama;
- identity must remain recognizable when confidence drops away.

---

## 5. B3 Diagnostic Reference

**B3 refinement render**  
Provider: HeyGen  
Voice ID: `10863794b2454eaa8781f377939d6f14`  
Observed generation URL at audition time:

`https://resource2.heygen.ai/text_to_speech/b0cbb3d7f0a549159794a8b3ba4a41ab/10863794b2454eaa8781f377939d6f14/id=55a92ff2-a617-407b-b998-0664ed296802.wav`

Diagnostic text:

> Some nights the silence says more than I do. I bought the jacket because it looked responsible. That was the first mistake. The second was assuming anybody in the room knew what they were doing.

The line intentionally stresses sibilants, conversational pacing, dry humor, and low-mid presence.

---

## 6. Singing-Direction Evidence

A separate musical-generation test was produced to validate the **singing behavior**, not the exact B3 timbre.

### Musical test

Provider: Picsart / MiniMax Music v3  
Generation handle: `99cd90d2-3e81-4554-abee-b2c96f5fb526`  
Observed output URL at generation time:

`https://cdn-editing-temp.picsart.com/editing-temp/64e7a442-b745-4706-af23-eb943067d53a.mp3`

Target behavior:

- low-mid male vocal;
- intimate close-mic singing;
- clean consonants;
- restrained breathiness;
- dark alternative R&B / electronic-pop;
- subtle melodic glide;
- emotionally guarded delivery.

**Evidence classification:** `MUSICAL_DIRECTION_VALIDATED / TIMBRE_NOT_VALIDATED`.

This test demonstrates a promising direction for melody, range, phrasing, and emotional behavior. It does **not** prove that B3 itself can sing in that manner or that a persistent B3-derived singer exists.

---

## 7. Provider / Rights Constraints Discovered

### Fal

A reference-preserving singing attempt was blocked because the connected Fal account had insufficient credits. No successful B3 singing asset was produced through Fal.

### Picsart

MiniMax Music v3 successfully produced the musical-direction test. A later generation attempt was blocked by insufficient available Picsart credits.

### ElevenLabs Speech-to-Speech

A connected ElevenLabs STS route is available through Picsart and can preserve timing and emotion while swapping a performance into another voice. However, the current B3 anchor is a public HeyGen provider voice, not an owned ElevenLabs voice.

**Do not clone or re-register B3 into another provider until voice-source rights and provider permissions are established.**

---

## 8. G2 Remaining Conditions

B3 remains `NOT_LOCKED` until the required G2 evidence is complete.

Required before `LOCKED`:

- [x] Artist Principal preference established.
- [x] One exact provider voice ID recorded.
- [x] Core timbral direction documented.
- [x] Singing behavior direction explored.
- [ ] Four-mode B3 audition set generated from the exact same B3 voice.
- [ ] Randomized, blinded, loudness-normalized recognition test completed.
- [ ] At least 12 valid independent raters.
- [ ] Aggregate same-performer recognition ≥70%.
- [ ] No mode-pair recognition category below 60%.
- [ ] Voice source and commercial-use permission verified.
- [ ] Persistent owned or contractually stable voice asset established, if required for release continuity.
- [ ] Singing-capable identity-preserving implementation validated.
- [ ] Final Artist Principal G2 approval recorded against the exact versioned asset.

---

## 9. Persistence Architecture

The production system should refer to the voice through an internal canonical alias rather than hard-coding a provider ID throughout the application.

Recommended logical contract:

```yaml
voice_identity_id: blaize-sunday/sunday-after-midnight
status: g2_finalist
current_reference:
  provider: heygen
  voice_id: 10863794b2454eaa8781f377939d6f14
  provider_asset_class: public
  internal_candidate: B3
rights:
  ownership: not_owned
  clone_permission: unknown
  commercial_continuity: unverified
modes:
  - sunday_talk
  - blaize_mode
  - velvet
  - zero_static
fallback_policy: fail_closed_on_identity_substitution
```

Consumers should resolve `blaize-sunday/sunday-after-midnight` through the voice registry. They must not silently substitute a different provider voice when the configured asset is unavailable.

---

## 10. Exact Next Work

1. Render B3 in all four canonical modes using the exact HeyGen voice ID.
2. Add singing-specific test material covering chest voice, mixed register, sustained vowel, short falsetto extension, and rhythm-to-melody transitions.
3. Establish a rights-clean route to a persistent proprietary or contractually stable voice before public-release dependence.
4. Run the formal G2 identity-recognition evaluation.
5. If G2 passes, create the immutable `SUNDAY_AFTER_MIDNIGHT_LOCKED_v1` asset record and only then allow downstream release workflows to treat the voice as production-ready.

Until then, **B3 is the preferred finalist and audible reference, not the locked production asset.**
