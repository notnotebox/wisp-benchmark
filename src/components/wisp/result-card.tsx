"use client";

import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isWisp, modelName, questionOf, type Availability, type Choice, type DecisionResult, type ModelId } from "@/lib/wisp";

type Names = Partial<Record<ModelId, Availability>>;

export type Cell =
  | { status: "pending" }
  | { status: "done"; result: DecisionResult }
  | { status: "skipped"; message: string }
  | { status: "error"; message: string };

export type Run = {
  id: string;
  index: number;
  text: string;
  choices: Choice[];
  models: [ModelId, ModelId];
  cells: Record<string, Cell>;
};

export const cellKey = (model: ModelId, choiceId: string) => `${model}:${choiceId}`;

const pct = (p: number) => `${Math.round(p * 100)} %`;

function certainty(result: DecisionResult) {
  if (result.confidence >= 0.85) return "high";
  return result.confidence >= 0.65 ? "medium" : "low";
}

/** Column titles shared by every band of the current model pair. */
export function PairHeader({ models, names }: { models: [ModelId, ModelId]; names?: Names }) {
  return (
    <div className="grid grid-cols-2 gap-3 pb-2 font-mono text-[11px] text-white/50 max-md:hidden">
      {models.map((model, side) => (
        <div key={side} className="flex items-baseline justify-between gap-3 px-5">
          <span className="font-sans text-[15px] font-medium text-[#f2f1ec]">{modelName(model, names)}</span>
          <span
            title={
              isWisp(model)
                ? "Wisp scores the offered choices directly; it does not generate a reasoning trace."
                : "Reasoning is disabled when the connected provider supports the requested setting. Generic endpoints may ignore it."
            }
          >
            {isWisp(model) ? "logits only · reasoning off" : "reasoning off requested"}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One comparison: the same input answered by both models, one card per model. */
export function RunBand({ run, names }: { run: Run; names?: Names }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline gap-2.5 px-1 text-white/60">
        <span className="font-mono text-[11px] text-white/35 tabular-nums">#{run.index}</span>
        <p className="line-clamp-2 text-sm">{run.text}</p>
      </div>

      {/* Two rounded panels split by a black slot that cuts in from both edges, each cut ending in
          a round cap, with a bridge joining the panels in the middle. Side by side from md up
          (slot from top and bottom), stacked on phones (slot from left and right). */}
      <div className="relative grid grid-cols-1 gap-3 text-black md:grid-cols-2">
        <span aria-hidden className="pointer-events-none absolute inset-y-8 left-1/2 w-6 -translate-x-1/2 bg-[#f2f1ec] max-md:hidden" />
        <span aria-hidden className="pointer-events-none absolute top-0 left-1/2 h-12 w-3 -translate-x-1/2 rounded-b-full bg-black max-md:hidden" />
        <span aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-12 w-3 -translate-x-1/2 rounded-t-full bg-black max-md:hidden" />
        {run.models.map((model, side) => (
          <div
            key={side}
            className="relative flex min-w-0 flex-col gap-4 rounded-[28px] bg-[#f2f1ec] px-5 py-5"
          >
            {/* Stacked layout: the slot hangs from the second panel so it stays in the gap
                whatever the panels' heights are (one can still be loading). */}
            {side === 1 && (
              <>
                <span aria-hidden className="pointer-events-none absolute inset-x-8 -top-[18px] h-6 bg-[#f2f1ec] md:hidden" />
                <span aria-hidden className="pointer-events-none absolute -top-3 left-0 h-3 w-12 rounded-r-full bg-black md:hidden" />
                <span aria-hidden className="pointer-events-none absolute -top-3 right-0 h-3 w-12 rounded-l-full bg-black md:hidden" />
              </>
            )}
            <span className="-mb-1 text-[15px] font-medium md:hidden">{modelName(model, names)}</span>
            {run.choices.map((choice) => (
              <ChoiceResult key={choice.id} choice={choice} cell={run.cells[cellKey(model, choice.id)]} />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ChoiceResult({ choice, cell }: { choice: Choice; cell: Cell | undefined }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] text-black/50">{questionOf(choice) || "Decision"}</span>
        {cell?.status === "done" && (
          <span className="shrink-0 font-mono text-[11px] text-black/40 tabular-nums">
            {cell.result.latency_ms} ms
          </span>
        )}
      </div>

      {(!cell || cell.status === "pending") && <PendingDecision options={choice.options} />}

      {cell?.status === "error" && <p className="font-mono text-xs text-red-700">{cell.message}</p>}

      {cell?.status === "skipped" && <p className="font-mono text-xs text-black/50">{cell.message}</p>}

      {cell?.status === "done" && <Decision options={choice.options} result={cell.result} />}
    </div>
  );
}

/** Keep the loading card the same height and geometry as a completed result. */
function PendingDecision({ options }: { options: string[] }) {
  return (
    <div className="min-h-[4.75rem]">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-5 w-28 bg-black/10" />
        <Skeleton className="h-3 w-32 bg-black/[0.06]" />
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {options.map((option) => (
          <div key={option} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3">
            <span className="truncate font-mono text-xs text-black/25">{option}</span>
            <Skeleton className="h-1.5 w-full bg-black/[0.07]" />
            <Skeleton className="h-3 w-7 justify-self-end bg-black/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Decision({ options, result }: { options: string[]; result: DecisionResult }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <motion.span
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="font-mono text-[17px] font-semibold tracking-tight"
        >
          {result.decision}
        </motion.span>
        <span className="font-mono text-xs text-black/50 tabular-nums">
          {result.calibration === "calibrated"
            ? `${pct(result.confidence)} · ${certainty(result)} certainty`
            : result.calibration === "self_reported"
              ? `${pct(result.confidence)} · model-reported confidence`
            : `${pct(result.confidence)} · uncalibrated relative score`}
        </span>
        {result.needs_review && (
          <Badge
            variant="outline"
            className="ml-auto h-5 border-black/20 px-2 text-[11px] text-black/60"
            title="Uncertain or unstable result: do not automate"
          >
            human review
          </Badge>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {options.map((option) => {
          const p = result.probabilities[option] ?? 0;
          const top = option === result.decision;
          return (
            <div key={option} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3">
              <span className={cn("truncate font-mono text-xs", top ? "text-black" : "text-black/40")}>{option}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${p * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn("h-full rounded-full", top ? "bg-black" : "bg-black/30")}
                />
              </div>
              <span className="text-right font-mono text-xs text-black/50 tabular-nums">{pct(p)}</span>
            </div>
          );
        })}
      </div>
      {result.mapping_disagreement > 0.1 && (
        <p className="mt-1.5 font-mono text-[11px] text-black/40">
          ranking disagreement {result.mapping_disagreement.toFixed(2)}
        </p>
      )}
    </div>
  );
}
