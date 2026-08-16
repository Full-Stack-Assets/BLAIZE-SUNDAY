export type CreativeControlState = "AI_DECIDES" | "USER_OVERRIDE" | "LOCKED";

export interface CreativeField<T> {
  key: string;
  label: string;
  state: CreativeControlState;
  value: T | null;
  aiGeneratedValue?: T;
  userValue?: T;
  lockedValue?: T;
  rationale?: string;
  lastUpdatedByAgentId?: string;
  lastUpdatedAt?: string;
}

export function createCreativeField<T>(
  key: string,
  label: string,
  userValue: T | null | undefined
): CreativeField<T> {
  if (userValue === undefined || userValue === null) {
    return { key, label, state: "AI_DECIDES", value: null };
  }
  return {
    key,
    label,
    state: "USER_OVERRIDE",
    value: userValue,
    userValue
  };
}

export function resolveCreativeField<T>(field: CreativeField<T>): T | null {
  if (field.state === "LOCKED") return field.lockedValue ?? field.value;
  if (field.state === "USER_OVERRIDE") return field.userValue ?? field.value;
  return field.aiGeneratedValue ?? field.value;
}
