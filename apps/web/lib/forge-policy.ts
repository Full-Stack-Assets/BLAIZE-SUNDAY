import { getServerApiKey, operatingMode } from "@songforge/llm";

export type ForgeDecision =
  | { kind: "simulated"; mode: "test" }
  | { kind: "remote"; mode: "live"; apiKey: string }
  | { kind: "blocked"; error: "BLOCKED_CONFIGURATION"; source: "none" };

/** Live mode never accepts a client-supplied key and never falls back to the local engine. */
export function decideForgeExecution(): ForgeDecision {
  const mode = operatingMode();
  if (mode === "test") return { kind: "simulated", mode };
  const apiKey = getServerApiKey();
  if (!apiKey) return { kind: "blocked", error: "BLOCKED_CONFIGURATION", source: "none" };
  return { kind: "remote", mode, apiKey };
}
