# SUNDAY AFTER MIDNIGHT — D1 Loudness Normalization Receipt

Status: `NORMALIZED / G2_PENDING`

Human-selected persistent voice: D1
Provider: ElevenLabs
Persistent voice ID: `j9nOYxfwt3sxAi32BnNI`

## Normalization

The four D1 canonical speech-mode proxies were normalized locally with FFmpeg `loudnorm` to a common evaluation target:

- integrated loudness target: `-16 LUFS`
- true peak ceiling: `-1.5 dBTP`
- loudness range target: `11 LU`
- output: MP3, 44.1 kHz, mono, 128 kbps

| Mode | SHA-256 |
|---|---|
| SUNDAY TALK | `0bbcc572b9868e5308f249bf52d7f4800f37898776ae57651900f4088254abd2` |
| BLAIZE MODE | `792eeef964060f381680a095d8d610196a6a22855461f63d3823086e310136f0` |
| VELVET | `1c8c4145f6a071720d4cfa326cc4478643e96b50556a2182261d68caa67b3544` |
| ZERO STATIC | `1037c246f8d7d447e6747dc304a9c19e046e7496c5cbe6f5d0c0f3386e56281e` |

## Boundary

This closes loudness normalization for the D1 four-mode proxy set only. It does **not** satisfy the canonical G2 blind-recognition gate by itself. Canon still requires exactly three masculine candidates × four modes, randomized/blinded/loudness-normalized evaluation, at least 12 valid independent raters, aggregate same-performer recognition >=70%, no mode-pair category below 60%, clear permission/provenance, and final Human Authority identity approval.

The current ElevenLabs design round produced D1/D2/D3 previews, but only D1 has Human Authority approval for persistence. D2 and D3 must not be silently persisted merely to complete the test matrix.

Singing identity remains a separate unverified capability. Speech-mode proxies are not evidence of singing continuity.
