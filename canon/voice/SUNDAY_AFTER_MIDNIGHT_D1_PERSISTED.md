# SUNDAY AFTER MIDNIGHT — D1 Persisted Candidate

Status: `D1_PERSISTED / G2_MODE_PROXIES_RENDERED / NOT_G2_LOCKED`

## Identity

- Artist: BLAIZE SUNDAY
- Canonical voice identity: `blaize-sunday/sunday-after-midnight`
- Canonical voice name: `SUNDAY AFTER MIDNIGHT`
- Selected candidate: `D1`
- Provider: ElevenLabs
- Persistent provider voice ID: `j9nOYxfwt3sxAi32BnNI`
- Provider category: `generated`
- Human Authority selection: `D1`
- Approval ID: `BLAIZE-G2-D1-SELECTION-2026-08-19`
- Selection date: 2026-08-19

## Provenance

D1 originated from ElevenLabs Text-to-Voice Design using `eleven_ttv_v3` with no reference audio.

- Source design request hash: `b322cfdba80af75eec24ce4798b4de6bf0941b0c4ff7e2c644564828f25fa76b`
- Source design run ID: `32251130820`
- Generated voice ID: `j9nOYxfwt3sxAi32BnNI`
- Persistence run ID: `32251778352`
- Persistence artifact ID: `9364690010`
- Persistence artifact digest: `sha256:20a01752894bf1f7250d15bed76709670c8d06a1bfa27e1c20ac25fd2cc43a9c`

The provider returned the same identifier when D1 was persisted as a reusable voice: `j9nOYxfwt3sxAi32BnNI`.

## Voice target

Original contemporary American masculine artist voice in a warm low-mid register. Intimate close-mic presence, relaxed slightly behind-the-beat phrasing, dry self-aware confidence, clean sibilants and crisp consonants, controlled breath texture, and an emotionally guarded baseline that can reveal precise vulnerability without melodrama.

Anti-targets remain:

- announcer / radio-DJ projection
- exaggerated bass or rasp
- cartoon swagger
- glossy generic pop tenor
- theatrical diction
- smeared consonants or lispy sibilants
- imitation of a known performer

## Four canonical speech-mode proxies

All four were rendered from the persistent D1 voice with ElevenLabs `eleven_multilingual_v2`, MP3 44.1 kHz mono at approximately 128 kbps.

### SUNDAY TALK

- speed: `0.92`
- stability: `0.58`
- similarity boost: `0.82`
- style: `0.10`
- technical duration: ~`8.18s`
- behavior: dry, close, conversational, deadpan, clean diction

### BLAIZE MODE

- speed: `1.08`
- stability: `0.42`
- similarity boost: `0.84`
- style: `0.28`
- technical duration: ~`7.84s`
- behavior: rhythm-forward, sharper attack, compact phrasing

### VELVET

- speed: `0.86`
- stability: `0.50`
- similarity boost: `0.86`
- style: `0.22`
- technical duration: ~`8.12s`
- behavior: softer, breathier, melodic extension target; this render is a speech proxy, not proof of singing identity

### ZERO STATIC

- speed: `0.78`
- stability: `0.68`
- similarity boost: `0.88`
- style: `0.04`
- technical duration: ~`10.16s`
- behavior: exposed, restrained, minimal theatricality

## Gate state

This record does **not** declare G2 passed.

Required before `G2_LOCKED`:

1. randomized / blinded evaluation across the four modes;
2. at least 12 valid independent raters;
3. aggregate same-performer recognition >= 70%;
4. no mode-pair recognition category below 60%;
5. rights / provider continuity evidence acceptable for intended use;
6. Human Authority final identity approval after the evidence is reviewed;
7. separate singing-capable validation before claiming stable sung-vocal identity.

Until those gates pass:

- `g2Locked = false`
- `singingValidated = false`
- `productionScalingAuthorized = false`

## Historical relationship to B3

HeyGen candidate B3 remains preserved as historical finalist evidence. D1 supersedes B3 as the currently selected persistent provider candidate, but B3 must not be deleted or rewritten as if it never existed.
