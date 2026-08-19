# BLAIZE SUNDAY — G2 Provider Rights & Persistence Evidence

**Voice identity:** SUNDAY AFTER MIDNIGHT  
**Current finalist:** B3  
**Provider:** HeyGen  
**Provider voice ID:** `10863794b2454eaa8781f377939d6f14`  
**Evidence date:** 2026-08-19  
**Gate impact:** `NO G2 RIGHTS GATE CHANGE`

## Verified facts

### 1. B3 is a public provider voice, not a private account voice

The connected HeyGen API identifies voices using an explicit `public` versus `private` type. The B3 audition source was returned from the public English male Starfish voice library.

A fresh connected-account query on 2026-08-19 for `type=private`, `gender=male`, `engine=starfish`, `language=English` returned **zero private voices**.

**Classification:** `PUBLIC_PROVIDER_ASSET / NOT_OWNED_CLONE`.

### 2. HeyGen permits commercial use of generated output on qualifying paid plans

HeyGen's current Terms state that Creator, Pro, and Business users own their User Output as between HeyGen and the user and that HeyGen does not restrict use of that output for the user's own purposes, including commercial purposes. The same Terms state that Free-plan User Output is licensed only for personal, non-commercial, and internal-evaluation purposes.

Official source: https://www.heygen.com/terms

HeyGen's current AI Voice Generator page likewise states that AI voiceovers on paid plans carry commercial-use rights and instructs users to check plan details before monetizing.

Official source: https://www.heygen.com/tool/ai-voice-generator

**Classification:** `COMMERCIAL_OUTPUT_RIGHTS / PLAN_CONDITIONAL`.

The connected tool surface does not expose the account subscription tier. Therefore the B3 commercial-use gate remains **UNVERIFIED** for production release.

### 3. HeyGen explicitly positions public voices for virtual-character use

HeyGen's current Voice FAQ describes public voices as appropriate for realistic virtual characters, general business videos, and presenters that do not require a custom voice. This supports B3's use as an audition/reference source for a fictional artist identity, but does not transfer ownership of the underlying public voice model.

Official source: https://help.heygen.com/en/articles/15544929-avatar-voice-faq-troubleshooting-best-practices-and-credits

**Classification:** `PUBLIC_VOICE_USE_CASE_SUPPORTED / OWNERSHIP_NOT_GRANTED`.

### 4. Public and private voices are distinct provider asset classes

HeyGen's developer documentation exposes `type=public` for the shared voice library and `type=private` for cloned voices.

Official source: https://developers.heygen.com/reference/list-voices

**Classification:** `ASSET_CLASS_DISTINCTION_VERIFIED`.

## Not established

The evidence above does **not** establish any of the following:

- ownership of the B3 public voice model;
- a right to clone or re-register B3 on ElevenLabs, Picsart, Fal, or another provider;
- perpetual availability of provider voice ID `10863794b2454eaa8781f377939d6f14`;
- contractual continuity of the B3 voice across provider changes;
- the connected HeyGen account's qualifying commercial subscription tier;
- identity-preserving singing capability for B3.

HeyGen's Terms reserve the ability to change the Services without notice and do not provide a specific perpetual-availability guarantee for a public voice ID. For BLAIZE release continuity, provider addressability today is therefore insufficient evidence of persistence.

## Canon outcome

Keep the existing B3 rights state unchanged:

```yaml
provider_asset_class: public
ownership: not_owned
clone_permission: unknown
commercial_permission: unverified
commercial_continuity: unverified
persistence_guarantee: unverified
cross_provider_clone: prohibited_until_rights_established
```

B3 remains valid for audition and internal identity-reference work under the existing fail-closed runtime policy. It must not become the irreversible public-release dependency until the exact account/license position and continuity strategy are verified.
