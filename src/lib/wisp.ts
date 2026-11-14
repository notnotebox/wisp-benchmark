// Shared contract between the Wisp Benchmark UI and its provider adapters.

/** "ollama:<tag>" is one model installed in the local Ollama; bare "ollama" means none is configured. */
export type ModelId = "wisp" | `wisp-${string}` | "ollama" | `ollama:${string}` | "openai-compatible" | "openrouter" | `conn:${string}` | "none";

export const isOllama = (id: string) => id === "ollama" || id.startsWith("ollama:");

/** Bare "wisp" means no Wisp model was detected; "wisp-<version>" is one served by a local runtime. */
export const isWisp = (id: string) => id === "wisp" || id.startsWith("wisp-");

/** The Wisp models to list: every one detected, or a single "none detected" entry. */
export function wispModels(statuses: Partial<Record<string, Availability>> | null) {
  const found = Object.keys(statuses ?? {}).filter((id) => id.startsWith("wisp-"));
  return (found.length > 0 ? found : ["wisp"]).map((id) => ({ id: id as ModelId, label: id }));
}

export const BASELINE_MODELS: { id: ModelId; label: string }[] = [
  { id: "ollama", label: "Ollama · local" },
  { id: "openai-compatible", label: "OpenAI API" },
  { id: "openrouter", label: "OpenRouter" },
];

/** The reference models to list: every Ollama model the server reported, then the other providers. */
export function baselineModels(statuses: Partial<Record<string, Availability>> | null) {
  const ollama = Object.keys(statuses ?? {}).filter((id) => id.startsWith("ollama:"));
  return [
    ...(ollama.length > 0 ? ollama.map((id) => ({ id: id as ModelId, label: id })) : BASELINE_MODELS.slice(0, 1)),
    ...BASELINE_MODELS.slice(1),
  ];
}

/** Whether a model can answer right now, and why not when it cannot. */
export type Availability = {
  state: "ready" | "unavailable" | "checking";
  detail: string;
  /** The model that will answer, when known (for example "Qwen3.5 4B"). */
  name?: string;
  /** Where it runs (for example "Ollama · local"). */
  via?: string;
};

/** The label to show for a model: the real model name when the provider reports one. */
export const modelName = (id: ModelId, statuses?: Partial<Record<ModelId, Availability>>) =>
  statuses?.[id]?.name ?? (MODEL_LABELS as Record<string, string>)[id] ?? id;
export type ModelStatuses = Partial<Record<ModelId, Availability>>;

export const MODEL_LABELS = Object.fromEntries(
  [{ id: "wisp", label: "Wisp" }, { id: "none", label: "– –" }, ...BASELINE_MODELS].map((m) => [m.id, m.label]),
) as Record<ModelId, string>;

/** One decision contract: a question and the closed set of answers allowed. */
export type Choice = {
  id: string;
  question: string;
  /** Text filled in by a preset or an example: shown greyed out, sent while the field is empty. */
  suggested?: string;
  options: string[];
};

export const questionOf = (choice: Choice) => choice.question.trim() || choice.suggested || "";

export type DecisionResult = {
  decision: string;
  probabilities: Record<string, number>;
  confidence: number;
  margin: number;
  needs_review: boolean;
  mapping_disagreement: number;
  calibration: "uncalibrated" | "calibrated" | "self_reported";
  latency_ms: number;
};

export type CompareRequest = {
  text: string;
  /** API task name of the active preset, forwarded to the Wisp server. */
  task: string | null;
  models: [ModelId, ModelId];
  choices: Choice[];
  /** Browser-owned models, such as local Wisp, must not be proxied through Vercel. */
  skipModels?: ModelId[];
};

export type CompareEvent =
  | { type: "result"; model: ModelId; choiceId: string; result: DecisionResult }
  | { type: "skipped"; model: ModelId; choiceId: string; message: string }
  | { type: "error"; model: ModelId; choiceId: string; message: string }
  | { type: "done" };

export type Preset = {
  id: string;
  label: string;
  /** Name used by the local Wisp API (`POST /decide`). */
  task: string;
  /** Name used in the canonical datasets. */
  datasetTask: string;
  example: string;
  choices: Omit<Choice, "id">[];
};

export const PRESETS: Preset[] = [
  {
    id: "moderation",
    label: "Moderation",
    task: "moderation",
    datasetTask: "CHAT_MODERATION",
    example: "I will find your address and make you pay.",
    choices: [{ question: "Human review required?", options: ["REVIEW", "NO_ACTION", "NEED_CONTEXT"] }],
  },
  {
    id: "moderation_detailed",
    label: "Moderation + category",
    task: "moderation",
    datasetTask: "CHAT_MODERATION",
    example: "I will find your address and make you pay.",
    choices: [
      { question: "Human review required?", options: ["REVIEW", "NO_ACTION", "NEED_CONTEXT"] },
      {
        question: "Category",
        options: ["INSULT", "THREAT", "HARASSMENT", "HATE", "SEXUAL", "DOXXING", "OTHER", "NONE"],
      },
    ],
  },
  {
    id: "report_validity",
    label: "Report validity",
    task: "report_validity",
    datasetTask: "REPORT_VALIDITY",
    example: "They threatened me in chat.",
    choices: [{ question: "Is this a valid report?", options: ["VALID_REPORT", "INVALID_REPORT"] }],
  },
  {
    id: "username",
    label: "Username",
    task: "username",
    datasetTask: "USERNAME_MODERATION",
    example: "Admin_OfficiaI",
    choices: [{ question: "Should this username be reviewed?", options: ["REVIEW", "NO_ACTION"] }],
  },
];

/** Presets and examples suggest question text: greyed out, sendable, and typed over by the user. */
export function choicesFrom(choices: Omit<Choice, "id">[]): Choice[] {
  return choices.map((c) => ({
    id: crypto.randomUUID(),
    question: "",
    suggested: c.question,
    options: [...c.options],
  }));
}
