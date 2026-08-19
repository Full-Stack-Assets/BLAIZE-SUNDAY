# BLAIZE SUNDAY — G2 Blind Voice Rater Packet

**Protocol:** BLAIZE-G2-VOICE-AUDITION  
**Target identity:** SUNDAY AFTER MIDNIGHT  
**Packet date:** 2026-08-19  
**State:** `PRE_NORMALIZATION / NOT_VALID_FOR_FINAL_LOCK`  

This packet is intentionally blind. Do not attempt to identify provider names, library voice names, or candidate labels. Do not assume how many performers are represented.

## Rater instructions

1. Listen to all 12 clips in the numbered order below once before scoring.
2. On a second pass, group clips that you believe are the **same underlying performer**, regardless of pacing or delivery mode.
3. Do not group clips because they have similar loudness, tempo, or production treatment.
4. For each clip, score naturalness, identity distinctiveness, pronunciation consistency, and emotional credibility from 1–5.
5. Record any specific artifact that influenced your decision, such as smeared sibilants, unstable timbre, synthetic cadence, or an apparent speaker change.
6. Submit your grouping and ratings without discussing them with other raters.

### Blind assets

| Blind ID | Audio |
|---|---|
| BS-G2-01 | https://cdn-editing-temp.picsart.com/editing-temp/2a3b2dbf-638e-471d-8137-48181316b575.mpeg |
| BS-G2-02 | https://cdn-editing-temp.picsart.com/editing-temp/8c6fa2e2-cb32-4fcf-856a-84e8632d9fd8.mpeg |
| BS-G2-03 | https://cdn-editing-temp.picsart.com/editing-temp/7bd2f40d-ba93-472b-bb1d-7fd164ecb424.mpeg |
| BS-G2-04 | https://cdn-editing-temp.picsart.com/editing-temp/167bacdd-d511-4ed9-b0e6-d272c1dd1511.mpeg |
| BS-G2-05 | https://cdn-editing-temp.picsart.com/editing-temp/63d16a15-f3ba-4084-8263-c6456d2817d7.mpeg |
| BS-G2-06 | https://cdn-editing-temp.picsart.com/editing-temp/bdf152b4-16ca-4800-afe6-fcbdf3b4315d.mpeg |
| BS-G2-07 | https://cdn-editing-temp.picsart.com/editing-temp/47e64b55-d7d3-4723-a432-aa5090562bed.mpeg |
| BS-G2-08 | https://cdn-editing-temp.picsart.com/editing-temp/83be1741-4004-4b62-b4b6-27074d787561.mpeg |
| BS-G2-09 | https://cdn-editing-temp.picsart.com/editing-temp/ef59f069-b139-4351-81f1-09743774ec5e.mpeg |
| BS-G2-10 | https://cdn-editing-temp.picsart.com/editing-temp/fc5ea379-61a0-4dab-8e1d-e81ae87d73ab.mpeg |
| BS-G2-11 | https://cdn-editing-temp.picsart.com/editing-temp/08dcb6e0-3415-4592-8df4-f24c40bdf437.mpeg |
| BS-G2-12 | https://cdn-editing-temp.picsart.com/editing-temp/72cd7da8-e33f-4fe9-ae48-38501ed93233.mpeg |

## Response format

```json
{
  "raterId": "opaque-rater-id",
  "groups": [
    ["BS-G2-01", "BS-G2-04"],
    ["BS-G2-02", "BS-G2-07"]
  ],
  "clipRatings": {
    "BS-G2-01": {
      "naturalness": 1,
      "identityDistinctiveness": 1,
      "pronunciationConsistency": 1,
      "emotionalCredibility": 1,
      "notes": ""
    }
  }
}
```

Each rating is an integer from 1 through 5. A rater may create any number of groups and may leave a clip alone if they believe it does not match another performer.

## Canonical pass conditions

The final G2 evaluation must use at least **12 valid independent raters**. The selected voice must achieve at least **70% aggregate same-performer recognition**, and no required mode-pair recognition category may fall below **60%**.

This packet is **not yet eligible for final G2 scoring** because loudness normalization has not been verified. The unblinding key is stored separately from the rater packet. Provider identity, commercial permission, persistence continuity, true singing identity, and final Artist Principal approval remain separate hard gates.
