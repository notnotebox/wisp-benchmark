import type { DecisionResult } from "@/lib/wisp";

type Runtime = { url: string; label: string };

/** "local" for a runtime on this machine, the address otherwise. */
function defaultLabel(url: string) {
  const { hostname, host } = new URL(url);
  return ["127.0.0.1", "localhost", "[::1]"].includes(hostname) ? "local" : host;
}

// Ports scanned by default; set NEXT_PUBLIC_WISP_LOCAL_URLS to use others. Comma separated, each
// entry either a URL or "name=URL". The grey text next to the model is "local" for this machine, the address
// for another one, or the name you give.
const DEFAULT_RUNTIMES: Runtime[] = [8781, 8782, 8783, 8784, 8785].map((port) => {
  const url = `http://127.0.0.1:${port}`;
  return { url, label: defaultLabel(url) };
});

function parseRuntimes(raw: string): Runtime[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const named = /^([^=/:]+)=(https?:\/\/.+)$/.exec(entry);
      const url = (named ? named[2] : entry).replace(/\/$/, "");
      try {
        return [{ url, label: named ? named[1].trim() : defaultLabel(url) }];
      } catch {
        return [];
      }
    });
}

const LOCAL_RUNTIMES = parseRuntimes(
  process.env.NEXT_PUBLIC_WISP_LOCAL_URLS ?? process.env.NEXT_PUBLIC_WISP_LOCAL_URL ?? "",
);

type AnnouncedModel = { id: string; label: string };
type ModelsPayload = { status: string; runtime: string; models: AnnouncedModel[] };

/** A Wisp model announced by a local runtime, and the runtime that serves it. */
export type DetectedWisp = { id: string; label: string; url: string; source: string };

async function probe({ url, label: source }: Runtime): Promise<DetectedWisp[]> {
  try {
    const response = await fetch(`${url}/v1/models`, { signal: AbortSignal.timeout(2_500) });
    const payload = (await response.json().catch(() => null)) as ModelsPayload | null;
    if (!response.ok || payload?.status !== "ok") return [];
    return (payload.models ?? [])
      .filter((model) => typeof model.id === "string" && model.id.startsWith("wisp-"))
      .map((model) => ({ id: model.id, label: model.label || model.id, url, source }));
  } catch {
    return [];
  }
}

/** Every Wisp model currently served by a local runtime. Runs in the visitor's browser. */
export async function detectLocalWisps(): Promise<DetectedWisp[]> {
  const runtimes = LOCAL_RUNTIMES.length > 0 ? LOCAL_RUNTIMES : DEFAULT_RUNTIMES;
  const found = (await Promise.all(runtimes.map(probe))).flat();
  // Two runtimes announcing the same id stay distinct: the port tells them apart.
  const seen = new Set<string>();
  const sources = found.map((m) => m.source);
  return found.map((model) => {
    const id = seen.has(model.id) ? `${model.id}@${new URL(model.url).port}` : model.id;
    seen.add(model.id);
    // Several runtimes with the same name (all "local"): the port tells them apart.
    const source = sources.filter((s) => s === model.source).length > 1 ? `${model.source} · :${new URL(model.url).port}` : model.source;
    return { ...model, id, source };
  });
}

export async function decideWispLocal(
  url: string,
  input: { task: string | null; text: string; question: string; options: string[] },
): Promise<DecisionResult> {
  const started = performance.now();
  const response = await fetch(`${url}/decide`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(90_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.result) {
    throw new Error(payload?.error ?? `Wisp local HTTP ${response.status}`);
  }
  const result = payload.result;
  return {
    decision: result.decision,
    probabilities: result.probabilities,
    confidence: result.confidence,
    margin: result.margin,
    needs_review: result.needs_review,
    mapping_disagreement: result.mapping_disagreement ?? 0,
    calibration: result.calibration ?? "uncalibrated",
    latency_ms: Math.round(performance.now() - started),
  };
}
