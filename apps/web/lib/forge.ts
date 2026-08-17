import type { SectionId } from "./types";

export interface ForgeVariation {
  id: string;
  label: string;
  text: string;
  note: string;
}

/**
 * Local Songforge variation engine.
 * This is the first real forge surface — intentional rewrites that protect
 * voice, tighten density, and offer real alternatives instead of generic AI sludge.
 * Later this becomes a call into the real agent / LLM package.
 */
export function forgeVariation(
  sectionId: SectionId,
  currentText: string,
  title: string
): ForgeVariation[] {
  const trimmed = currentText.trim();
  if (!trimmed) {
    return [
      {
        id: "empty-1",
        label: "Starter A",
        text: getStarter(sectionId, title),
        note: "Cold open — no prior lines to work from.",
      },
      {
        id: "empty-2",
        label: "Starter B",
        text: getStarterAlt(sectionId, title),
        note: "Different entry angle.",
      },
    ];
  }

  // Real variants for the known active work
  if (title === "LOOKS EXPENSIVE") {
    const specific = getLooksExpensiveVariants(sectionId, trimmed);
    if (specific.length) return specific;
  }

  // Generic high-signal transforms
  return [
    {
      id: `v-${Date.now()}-a`,
      label: "Tighter",
      text: tightenDensity(trimmed),
      note: "Cut fat, keep the image, raise internal rhyme.",
    },
    {
      id: `v-${Date.now()}-b`,
      label: "Darker turn",
      text: darkerTurn(trimmed),
      note: "Same bones, colder aftertaste.",
    },
  ];
}

function getStarter(sectionId: SectionId, title: string): string {
  const starters: Record<string, string> = {
    intro: "lights still on but nobody home\nI walked in looking like the reason they left",
    verse1:
      "mirror don't lie, it just don't care\nI been dressing the wound like it's fashion",
    pre1: "they keep saying wait\nI already spent the wait",
    chorus: "I still look expensive\neven when the night is cheap",
    verse2: "same city different exit\nstill wearing the proof",
    bridge: "tell me what I'm supposed to do with all this shine\nwhen the room keeps getting smaller",
    final: "I look expensive\nthat's the only truth that stuck",
    outro: "static fades\nI don't",
  };
  return starters[sectionId] ?? "start with the image that won't leave";
}

function getStarterAlt(sectionId: SectionId, title: string): string {
  const starters: Record<string, string> = {
    intro: "soft noise under expensive silence",
    verse1: "chain heavier than the conversation\nI still show up like the bill is paid",
    pre1: "slow down for who",
    chorus: "look expensive\nfeel temporary",
    verse2: "pretty problem in a clean room",
    bridge: "the outfit outlived the decision",
    final: "still look expensive\nstill don't explain",
    outro: "leave the light on for the version that stayed",
  };
  return starters[sectionId] ?? "different door, same house";
}

function getLooksExpensiveVariants(
  sectionId: SectionId,
  current: string
): ForgeVariation[] {
  if (sectionId === "chorus") {
    return [
      {
        id: "le-chorus-a",
        label: "Sharper hook",
        text: "I look expensive\neven when the night don't care\nI look expensive\nnothing left to wear but the stare",
        note: "Removed one soft word. Stare becomes the only object left.",
      },
      {
        id: "le-chorus-b",
        label: "Colder",
        text: "I look expensive\neven when the room goes quiet\nI look expensive\nwith nothing left but the receipt",
        note: "Trade 'stare' for 'receipt' — still visual, more transactional.",
      },
    ];
  }
  if (sectionId === "verse1") {
    return [
      {
        id: "le-v1-a",
        label: "More friction",
        text: "mirror talkin' back like it got opinions\nchain still heavy, pockets full of friction\npretty face, ugly timing\nlooking like the problem and the only solution",
        note: "Last line tightened. 'the only' gives it more weight.",
      },
      {
        id: "le-v1-b",
        label: "Darker self",
        text: "mirror talkin' back like it got opinions\nchain still heavy, pockets full of friction\npretty face, ugly timing\nI been the warning and the decoration",
        note: "New final image. Keeps the contradiction.",
      },
    ];
  }
  if (sectionId === "intro") {
    return [
      {
        id: "le-intro-a",
        label: "Cleaner entry",
        text: "soft static under the streetlight\nstill look expensive even when I'm not right",
        note: "Dropped the 'I'. More immediate.",
      },
      {
        id: "le-intro-b",
        label: "Colder open",
        text: "streetlight on the chrome\nI still look expensive when the night don't know my name",
        note: "Different image, same thesis.",
      },
    ];
  }
  return [];
}

function tightenDensity(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/\b(just|really|very|actually|literally)\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

function darkerTurn(text: string): string {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) return text;
  const last = lines[lines.length - 1];
  const darkerLast = last
    .replace(/care/gi, "notice")
    .replace(/light/gi, "dark")
    .replace(/smile/gi, "stare")
    .replace(/love/gi, "need");
  return [...lines.slice(0, -1), darkerLast].join("\n");
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
