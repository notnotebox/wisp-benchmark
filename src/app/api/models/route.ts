import { isHostedRequest } from "@/lib/hosted-request";
import { configuredOllamaModels } from "@/lib/ollama-config";
import type { Availability, ModelStatuses } from "@/lib/wisp";

const PROBE_TIMEOUT_MS = 2_500;

const unavailable = (detail: string): Availability => ({ state: "unavailable", detail });
const ready = (name: string, via: string): Availability => ({ state: "ready", detail: name, name, via });

/** "qwen3.5:4b" becomes "Qwen3.5 4B"; "llama3.2:latest" becomes "Llama3.2". */
function prettyModelName(raw: string) {
  const [base, tag] = raw.split(":");
  const name = base.charAt(0).toUpperCase() + base.slice(1);
  if (!tag || tag === "latest") return name;
  return /^\d+(\.\d+)?[bm]$/i.test(tag) ? `${name} ${tag.toUpperCase()}` : `${name} ${tag}`;
}

async function ollamaStatuses(): Promise<ModelStatuses> {
  const tags = configuredOllamaModels();
  if (tags.length === 0) return { ollama: unavailable("OLLAMA_MODELS is not set") };
  const baseUrl = (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
  let installed: string[] | null = null;
  let failure = "Ollama is not running";
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as { models?: Array<{ name?: string }> } | null;
      installed = (payload?.models ?? []).map((entry) => entry.name ?? "");
    } else {
      failure = `Ollama answered HTTP ${response.status}`;
    }
  } catch {
    // keep the default message
  }
  return Object.fromEntries(
    tags.map((tag): [string, Availability] => {
      if (installed === null) return [`ollama:${tag}`, { ...unavailable(failure), name: prettyModelName(tag), via: "Ollama · local" }];
      const present = installed.some((name) => name === tag || name === `${tag}:latest`);
      return [
        `ollama:${tag}`,
        present
          ? ready(prettyModelName(tag), "Ollama · local")
          : { ...unavailable(`${tag} is not installed in Ollama`), name: prettyModelName(tag), via: "Ollama · local" },
      ];
    }),
  );
}

async function openAiCompatibleStatus(): Promise<Availability> {
  const baseUrl = process.env.OPENAI_COMPATIBLE_URL;
  const model = process.env.OPENAI_COMPATIBLE_MODEL;
  if (!baseUrl || !model) return unavailable("OPENAI_COMPATIBLE_URL or _MODEL is not set");
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (response.status === 401 || response.status === 403) return unavailable("The endpoint rejected the API key");
    return ready(model, "OpenAI-compatible");
  } catch {
    return unavailable("The endpoint is not reachable");
  }
}

function openRouterStatus(): Availability {
  if (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL) {
    return unavailable("OPENROUTER_API_KEY or _MODEL is not set");
  }
  return { ...ready(process.env.OPENROUTER_MODEL, "OpenRouter"), detail: `${process.env.OPENROUTER_MODEL} (key not verified)` };
}

/** Which reference models can answer right now. Never exposes keys or URLs. */
export async function GET(request: Request) {
  const hosted = isHostedRequest(request);
  const [ollama, openai] = await Promise.all([ollamaStatuses(), openAiCompatibleStatus()]);
  const statuses: ModelStatuses = {
    ...ollama,
    "openai-compatible": openai,
    openrouter: openRouterStatus(),
  };
  if (hosted) {
    for (const [id, status] of Object.entries(statuses)) {
      if (status?.state === "unavailable") statuses[id as keyof ModelStatuses] = { state: "unavailable", detail: "Use Connect to add one" };
    }
  }
  return Response.json(statuses, { headers: { "cache-control": "no-store" } });
}
