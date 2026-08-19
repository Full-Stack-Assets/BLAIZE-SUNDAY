export const I4_ACTIONS = [
  "publish",
  "distributor_submit",
  "public_post",
  "outreach",
  "paid_spend",
  "rights_transfer",
  "voice_canon_change",
  "buyer_contact"
] as const;

export type I4Action = (typeof I4_ACTIONS)[number];

export function monthlyBudgetUsd(): number {
  const raw = process.env.MONTHLY_BUDGET_USD ?? "0";
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function assertPaidCallAllowed(estimatedUsd: number): void {
  if (estimatedUsd <= 0) return;
  if (monthlyBudgetUsd() <= 0) {
    const error = new Error("BLOCKED_BUDGET");
    error.name = "PolicyError";
    throw error;
  }
}

export function requiresHumanI4(action: string): boolean {
  return (I4_ACTIONS as readonly string[]).includes(action);
}

export function permissionTier(
  action: "read" | "draft" | "reversible" | "external"
): "I1" | "I2" | "I3" | "I4" {
  if (action === "read") return "I1";
  if (action === "draft") return "I2";
  if (action === "reversible") return "I3";
  return "I4";
}
