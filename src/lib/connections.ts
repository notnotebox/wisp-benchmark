// Models the visitor connects from the browser. Nothing here is sent to the site's server:
// requests go straight from the browser to the endpoint, and the site makes none on your behalf.
//
// Storage: names and addresses are kept in localStorage. An API key is kept for this tab only
// (sessionStorage) unless the visitor ticks "remember", in which case it is kept in localStorage.
import {
  decideAnthropic,
  decideChatCompletions,
  decideOllamaAt,
  decideOpenRouterDecisions,
  isDecisionsModel,
  type DecisionInput,
} from "@/lib/providers";
import type { DecisionResult } from "@/lib/wisp";

export type ConnectionKind = "ollama" | "compatible" | "openai" | "anthropic" | "gemini" | "openrouter";

export type Connection = {
  id: string;
  kind: ConnectionKind;
  /** Name shown in the model list. */
  label: string;
  /** Base URL. Fixed for the hosted providers. */
  url: string;
  model: string;
  /** Only present while available: tab-only by default. */
  apiKey?: string;
  /** The visitor chose to keep the key on this device. */
  remember?: boolean;
};

export const KIND_LABEL: Record<ConnectionKind, string> = {
  ollama: "Ollama (local)",
  compatible: "OpenAI-compatible server",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
};

export const DEFAULT_URL: Record<ConnectionKind, string> = {
  ollama: "http://127.0.0.1:11434",
  compatible: "http://127.0.0.1:1234/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  openrouter: "https://openrouter.ai/api/v1",
};

/** Whether the address is fixed (a hosted provider) or editable (your own server). */
export const FIXED_URL: Record<ConnectionKind, boolean> = {
  ollama: false,
  compatible: false,
  openai: true,
  anthropic: true,
  gemini: true,
  openrouter: true,
};

export const NEEDS_KEY: Record<ConnectionKind, boolean> = {
  ollama: false,
  compatible: false,
  openai: true,
  anthropic: true,
  gemini: true,
  openrouter: true,
};

export const MODEL_PLACEHOLDER: Record<ConnectionKind, string> = {
  ollama: "Model, e.g. qwen3.5:4b",
  compatible: "Model name",
  openai: "Model, e.g. gpt-4o-mini",
  anthropic: "Model, e.g. claude-haiku-5-5",
  gemini: "Model, e.g. gemini-2.5-flash",
  openrouter: "Model, e.g. typesafe/jev-1.13",
};

const STORAGE_KEY = "wisp-benchmark.connections.v2";
const SESSION_KEYS = "wisp-benchmark.session-keys.v2";

export const connectionModelId = (connection: Connection) => `conn:${connection.id}` as const;

function readSessionKeys(): Record<string, string> {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEYS) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function loadConnections(): Connection[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    const session = readSessionKeys();
    return parsed
      .filter(
        (c): c is Connection =>
          !!c && typeof c.id === "string" && typeof c.model === "string" && typeof c.url === "string" && c.kind in KIND_LABEL,
      )
      .map((c) => ({ ...c, apiKey: c.remember ? c.apiKey : session[c.id] }));
  } catch {
    return [];
  }
}

export function saveConnections(connections: Connection[]) {
  try {
    const session: Record<string, string> = {};
    const persistent = connections.map((c) => {
      if (c.apiKey && !c.remember) session[c.id] = c.apiKey;
      return { ...c, apiKey: c.remember ? c.apiKey : undefined };
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent));
    window.sessionStorage.setItem(SESSION_KEYS, JSON.stringify(session));
  } catch {
    // Storage can be blocked (private window); the connections then last for this page only.
  }
}

export function clearConnections() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_KEYS);
  } catch {
    // nothing stored
  }
}

const NO_TEMPERATURE = /^(o\d|gpt-5)/i;

/** One decision, asked straight from the browser to the connected endpoint. */
export function decideConnection(connection: Connection, input: DecisionInput): Promise<DecisionResult> {
  if (NEEDS_KEY[connection.kind] && !connection.apiKey) {
    return Promise.reject(new Error("The key for this connection is not set. Open Connect and paste it again."));
  }
  const key = connection.apiKey;
  switch (connection.kind) {
    case "ollama":
      return decideOllamaAt(connection.url, connection.model, input);
    case "anthropic":
      return decideAnthropic(key as string, connection.model, input);
    case "openrouter":
      return isDecisionsModel(connection.model)
        ? decideOpenRouterDecisions(key as string, connection.model, input)
        : decideChatCompletions(connection.url, connection.model, key, input, { openRouter: true });
    case "openai":
      return decideChatCompletions(connection.url, connection.model, key, input, {
        noTemperature: NO_TEMPERATURE.test(connection.model),
      });
    case "gemini":
    case "compatible":
      return decideChatCompletions(connection.url, connection.model, key, input);
  }
}

/** Sends one tiny request, so the visitor sees right away whether the connection works. */
export async function testConnection(connection: Connection): Promise<{ ok: true; ms: number } | { ok: false; message: string }> {
  try {
    const result = await decideConnection(connection, {
      task: null,
      text: "hello",
      question: "Is this a greeting?",
      options: ["YES", "NO"],
    });
    return { ok: true, ms: result.latency_ms };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    // A browser reports a blocked cross-origin call as a generic network error.
    return {
      ok: false,
      message: /failed to fetch|networkerror|load failed/i.test(message)
        ? "Could not reach it. Check the address, and that the server allows requests from this site (see the hint below)."
        : message,
    };
  }
}
