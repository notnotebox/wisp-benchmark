// Request building and answer parsing shared by the server routes and the browser connections.
import type { DecisionResult } from "@/lib/wisp";

export type DecisionInput = { task: string | null; text: string; question: string; options: string[] };

/** Generic chat models expose no logits. Their confidence is explicitly marked as self-reported. */
export function selfReportedResult(options: string[], payload: unknown, latency_ms: number): DecisionResult {
  if (!payload || typeof payload !== "object") throw new Error("The provider did not return JSON.");
  const value = payload as { decision?: unknown; confidence?: unknown };
  if (typeof value.decision !== "string" || !options.includes(value.decision)) {
    throw new Error("The provider returned a missing decision or one outside the requested options.");
  }
  const rawConfidence = Number(value.confidence);
  const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0.5;
  const remaining = (1 - confidence) / (options.length - 1);
  return {
    decision: value.decision,
    probabilities: Object.fromEntries(options.map((option) => [option, option === value.decision ? confidence : remaining])),
    confidence,
    margin: Math.max(0, confidence - remaining),
    needs_review: confidence < 0.7,
    mapping_disagreement: 0,
    calibration: "self_reported",
    latency_ms,
  };
}

export function instructionFor(body: DecisionInput) {
  return [
    "You are a closed-set classification adapter.",
    "Return JSON only, with exactly decision and confidence.",
    `Task: ${body.task ?? "custom"}`,
    `Content: ${body.text}`,
    `Question: ${body.question}`,
    `Allowed decisions: ${body.options.join(", ")}`,
    'Schema: {"decision":"one allowed decision","confidence":0.0}',
  ].join("\n");
}

type ChatCompletion = { choices?: Array<{ message?: { content?: string | null } }> };

export async function decideChatCompletions(
  baseUrl: string,
  model: string,
  apiKey: string | undefined,
  body: DecisionInput,
  extra: { openRouter?: boolean; noTemperature?: boolean } = {},
): Promise<DecisionResult> {
  const started = performance.now();
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({
      model,
      ...(extra.noTemperature ? {} : { temperature: 0 }),
      response_format: { type: "json_object" },
      ...(extra.openRouter ? { reasoning: { effort: "none", exclude: true } } : {}),
      messages: [{ role: "user", content: instructionFor(body) }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const payload = (await response.json().catch(() => null)) as ChatCompletion | { error?: { message?: string } } | null;
  if (!response.ok) {
    const message = payload && "error" in payload ? payload.error?.message : undefined;
    throw new Error(message ?? `HTTP ${response.status}`);
  }
  const content = (payload as ChatCompletion)?.choices?.[0]?.message?.content;
  if (!content) throw new Error("The provider did not produce content.");
  try {
    return selfReportedResult(body.options, JSON.parse(content), Math.round(performance.now() - started));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The provider")) throw error;
    throw new Error("The provider did not follow the requested JSON format.");
  }
}

export async function decideOllamaAt(baseUrl: string, model: string, body: DecisionInput): Promise<DecisionResult> {
  const started = performance.now();
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      think: false,
      options: { temperature: 0 },
      messages: [{ role: "user", content: instructionFor(body) }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const payload = (await response.json().catch(() => null)) as { message?: { content?: string }; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? `Ollama HTTP ${response.status}`);
  if (!payload?.message?.content) throw new Error("Ollama did not produce content.");
  try {
    return selfReportedResult(body.options, JSON.parse(payload.message.content), Math.round(performance.now() - started));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The provider")) throw error;
    throw new Error("Ollama did not follow the requested JSON format.");
  }
}

/** Anthropic's own Messages API, called straight from the browser (it allows that with an explicit header). */
export async function decideAnthropic(apiKey: string, model: string, body: DecisionInput): Promise<DecisionResult> {
  const started = performance.now();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      temperature: 0,
      messages: [{ role: "user", content: instructionFor(body) }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const payload = (await response.json().catch(() => null)) as
    | { content?: Array<{ type?: string; text?: string }>; error?: { message?: string } }
    | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Anthropic HTTP ${response.status}`);
  const text = payload?.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error("The provider did not produce content.");
  // The model may wrap the JSON in prose or a code fence: take the first object.
  const json = /\{[\s\S]*\}/.exec(text)?.[0];
  try {
    return selfReportedResult(body.options, JSON.parse(json ?? text), Math.round(performance.now() - started));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The provider")) throw error;
    throw new Error("The provider did not follow the requested JSON format.");
  }
}

/** Jev-style models are served by OpenRouter's decisions endpoint, not by chat completions. */
export const isDecisionsModel = (model: string) => /^~?(typesafe\/)?jev/i.test(model);

type DecisionsResponse = {
  answers?: Record<string, { type?: string; choice?: string; probabilities?: Record<string, number>; confidence?: number }>;
  error?: { message?: string };
};

export async function decideOpenRouterDecisions(apiKey: string, configuredModel: string, body: DecisionInput): Promise<DecisionResult> {
  const model = configuredModel.startsWith("jev") ? `typesafe/${configuredModel}` : configuredModel;
  const started = performance.now();
  const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      state: body.text,
      questions: {
        decision: {
          type: "choice",
          instructions: body.question,
          criteria: Object.fromEntries(body.options.map((option) => [option, null])),
        },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const payload = (await response.json().catch(() => null)) as DecisionsResponse | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `OpenRouter HTTP ${response.status}`);
  const answer = payload?.answers?.decision;
  if (answer?.type !== "choice" || !answer.choice || !body.options.includes(answer.choice)) {
    throw new Error("The decisions endpoint returned a missing answer or one outside the requested options.");
  }
  const probabilities = Object.fromEntries(body.options.map((option) => [option, answer.probabilities?.[option] ?? 0]));
  const ranked = Object.values(probabilities).sort((a, b) => b - a);
  const confidence = probabilities[answer.choice];
  return {
    decision: answer.choice,
    probabilities,
    confidence,
    margin: confidence - (ranked[1] ?? 0),
    needs_review: confidence < 0.7,
    mapping_disagreement: 0,
    calibration: "calibrated",
    latency_ms: Math.round(performance.now() - started),
  };
}
