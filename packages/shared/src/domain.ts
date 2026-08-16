import { createHash } from "node:crypto";

type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

function normalizeJson(value: unknown, seen: Set<object>): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Payload numbers must be finite.");
    }

    return value;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError("Payload must not contain cycles.");
    seen.add(value);
    const normalized = value.map(item => normalizeJson(item, seen));
    seen.delete(value);
    return normalized;
  }

  if (typeof value === "object") {
    if (seen.has(value)) throw new TypeError("Payload must not contain cycles.");
    seen.add(value);

    const normalized: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) {
        throw new TypeError(`Payload property ${key} must not be undefined.`);
      }
      normalized[key] = normalizeJson(item, seen);
    }

    seen.delete(value);
    return normalized;
  }

  throw new TypeError(`Unsupported payload value: ${typeof value}.`);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value, new Set()));
}

export function hashPayload(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
