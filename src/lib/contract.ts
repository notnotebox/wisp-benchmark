import { z } from "zod";

import { PRESETS, questionOf, type Choice } from "@/lib/wisp";

/** The raw-mode document: what a developer would paste to describe one decision request. */
const contractSchema = z.object({
  task: z.string().nullable().optional(),
  text: z.string(),
  questions: z
    .array(
      z.object({
        question: z.string().default(""),
        options: z.array(z.string().regex(/^\S+$/, "options cannot contain spaces")),
      }),
    )
    .default([]),
});

type ContractState = { text: string; suggestedText: string; presetId: string | null; choices: Choice[] };

// JSON shows what will be sent: suggestions are written out as plain values.
export function toContractJson({ text, suggestedText, presetId, choices }: ContractState) {
  const preset = PRESETS.find((p) => p.id === presetId);
  // Hand-formatted so each question fits on one line and the editor stays compact.
  const questions = choices.map(
    (c) => `    { "question": ${JSON.stringify(questionOf(c))}, "options": ${JSON.stringify(c.options).replaceAll(",", ", ")} }`,
  );
  return [
    "{",
    `  "task": ${JSON.stringify(preset?.task ?? null)},`,
    `  "text": ${JSON.stringify(text.trim() ? text : suggestedText)},`,
    questions.length ? `  "questions": [\n${questions.join(",\n")}\n  ]` : `  "questions": []`,
    "}",
  ].join("\n");
}

export function parseContractJson(
  source: string,
  previous: ContractState,
): { ok: true; state: ContractState } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "JSON invalide" };
  }
  const parsed = contractSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };

  const { task, text, questions } = parsed.data;
  // Keep the preset if the task still matches it, otherwise take the first preset for that task.
  const current = PRESETS.find((p) => p.id === previous.presetId);
  const presetId =
    current && current.task === task ? current.id : (PRESETS.find((p) => p.task === task)?.id ?? null);

  return {
    ok: true,
    state: {
      text,
      suggestedText: "",
      presetId,
      choices: questions.map((q, i) => ({
        id: previous.choices[i]?.id ?? crypto.randomUUID(),
        question: q.question,
        options: q.options.map((o) => o.toUpperCase()),
      })),
    },
  };
}
