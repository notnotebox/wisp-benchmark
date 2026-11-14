import { z } from "zod";

import { configuredOllamaModels } from "@/lib/ollama-config";
import { isHostedRequest } from "@/lib/hosted-request";
import {
  decideChatCompletions,
  decideOllamaAt,
  decideOpenRouterDecisions,
  isDecisionsModel,
  type DecisionInput,
} from "@/lib/providers";
import type { CompareEvent, DecisionResult, ModelId } from "@/lib/wisp";

const modelId = z.string().regex(/^(wisp(-[A-Za-z0-9._@:-]{1,80})?|openai-compatible|openrouter|ollama(:[A-Za-z0-9._:/-]{1,80})?|conn:[A-Za-z0-9-]{1,64})$/) as z.ZodType<ModelId>;

const requestSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  task: z.string().nullable(),
  models: z.tuple([modelId, modelId]),
  choices: z.array(z.object({
    id: z.string().min(1),
    question: z.string().max(200),
    options: z.array(z.string().trim().min(1).max(60)).min(2).max(12),
  })).min(1).max(8),
  skipModels: z.array(modelId).max(2).optional().default([]),
});

const CONNECT_HINT = "Nothing is connected for this model. Use Connect to add one (it stays in your browser).";

async function decideModel(model: ModelId, body: DecisionInput, hosted: boolean): Promise<DecisionResult> {
  if (model.startsWith("conn:")) throw new Error("Connections are executed directly by the browser.");
  if (model.startsWith("ollama:")) {
    if (hosted) throw new Error(CONNECT_HINT);
    const tag = model.slice("ollama:".length);
    if (!configuredOllamaModels().includes(tag)) throw new Error(`${tag} is not listed in OLLAMA_MODELS.`);
    return decideOllamaAt(process.env.OLLAMA_URL ?? "http://127.0.0.1:11434", tag, body);
  }
  if (model.startsWith("wisp-")) {
    if (hosted) throw new Error("No Wisp runtime was found on this machine. See the README to run one locally.");
    throw new Error("Wisp models are executed directly by the browser against the local runtime.");
  }
  if (hosted) throw new Error(CONNECT_HINT);
  switch (model) {
    case "wisp":
      throw new Error("No Wisp model was detected. Start a local Wisp runtime, then refresh.");
    case "ollama":
      throw new Error("No Ollama model is configured. Set OLLAMA_MODELS in .env.local.");
    case "openai-compatible": {
      const baseUrl = process.env.OPENAI_COMPATIBLE_URL;
      const configuredModel = process.env.OPENAI_COMPATIBLE_MODEL;
      if (!baseUrl || !configuredModel) {
        throw new Error("Configure OPENAI_COMPATIBLE_URL and OPENAI_COMPATIBLE_MODEL in .env.local.");
      }
      return decideChatCompletions(baseUrl, configuredModel, process.env.OPENAI_COMPATIBLE_API_KEY, body);
    }
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY;
      const configuredModel = process.env.OPENROUTER_MODEL;
      if (!apiKey || !configuredModel) {
        throw new Error("Configure OPENROUTER_API_KEY and OPENROUTER_MODEL in .env.local. Wisp never provides a shared key.");
      }
      if (isDecisionsModel(configuredModel)) return decideOpenRouterDecisions(apiKey, configuredModel, body);
      return decideChatCompletions("https://openrouter.ai/api/v1", configuredModel, apiKey, body, { openRouter: true });
    }
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  const { text, task, models, choices, skipModels } = parsed.data;
  const hosted = isHostedRequest(request);
  const skipped = new Set(skipModels);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CompareEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      for (const model of [...new Set(models)]) {
        for (const choice of choices) {
          if (skipped.has(model)) {
            send({ type: "skipped", model, choiceId: choice.id, message: "Executed by the browser" });
            continue;
          }
          try {
            const result = await decideModel(model, { task, text, question: choice.question, options: choice.options }, hosted);
            send({ type: "result", model, choiceId: choice.id, result });
          } catch (error) {
            send({ type: "error", model, choiceId: choice.id, message: error instanceof Error ? error.message : "Unknown error" });
          }
        }
      }
      send({ type: "done" });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
