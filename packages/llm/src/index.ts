export class LlmConfigurationError extends Error {
  readonly code = "BLOCKED_CONFIGURATION";
  constructor(message = "OPENAI_API_KEY is not configured") {
    super(message);
    this.name = "LlmConfigurationError";
  }
}

export class LlmProviderError extends Error {
  readonly code = "BLOCKED_PROVIDER";
  constructor(message: string) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export function operatingMode(): "live" | "test" {
  return process.env.SONGFORGE_MODE === "test" ? "test" : "live";
}

export function getServerApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY || "";
  return key.trim() || null;
}

export function requireLiveKey(): string {
  const key = getServerApiKey();
  if (!key) throw new LlmConfigurationError();
  return key;
}

export interface StructuredCompletionInput {
  system: string;
  user: string;
  schemaHint?: string;
}

export async function completeJson<T>(input: StructuredCompletionInput): Promise<T> {
  if (operatingMode() === "test") {
    throw new LlmProviderError("TEST_MODE_DOES_NOT_CALL_PROVIDERS");
  }
  const apiKey = requireLiveKey();
  const base = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user }
      ]
    })
  });
  if (!res.ok) throw new LlmProviderError(`LLM_${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new LlmProviderError("EMPTY_LLM_RESPONSE");
  return JSON.parse(content) as T;
}
