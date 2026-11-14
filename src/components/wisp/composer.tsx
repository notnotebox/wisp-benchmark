"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpIcon, DicesIcon, PlugIcon, PlusIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RawEditor from "@/components/wisp/raw-editor";
import { parseContractJson, toContractJson } from "@/lib/contract";
import { randomScenario } from "@/lib/examples";
import { cn } from "@/lib/utils";
import { connectionModelId, type Connection } from "@/lib/connections";
import {
  baselineModels,
  PRESETS,
  wispModels,
  choicesFrom,
  type Availability,
  type Choice,
  type ModelId,
  modelName,
} from "@/lib/wisp";


const DOT: Record<Availability["state"], string> = {
  ready: "bg-emerald-500",
  checking: "bg-white/30",
  unavailable: "bg-red-500",
};

/** A model entry with a status dot and, when it cannot answer, the reason. */
function ModelOption({ label, status }: { label: string; status?: Availability }) {
  const ready = status?.state === "ready" && status.name;
  return (
    <>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status?.state ?? "checking"])} />
        {ready ? status.name : label}
      </span>
      {status && (ready || status.state !== "ready") && (
        <span className="ml-auto pl-4 font-mono text-[10px] text-white/45">{ready ? status.via : status.detail}</span>
      )}
    </>
  );
}

const toItems = (list: { id: string; label: string }[], statuses?: Partial<Record<ModelId, Availability>>) =>
  list.map((m) => ({ value: m.id, label: modelName(m.id as ModelId, statuses) }));

/** A dark segmented strip that groups the controls above the card. */
function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-0.5 rounded-lg bg-white/[0.07] p-0.5 ring-1 ring-white/10 ring-inset",
        className,
      )}
      {...props}
    />
  );
}

const ToolbarDivider = () => <span aria-hidden className="mx-1 h-3.5 w-px bg-white/15" />;

const triggerClass =
  "h-7 rounded-md border-0 bg-transparent px-2.5 text-[13px] font-medium text-[#f2f1ec] hover:bg-white/10 focus-visible:ring-white/20 data-popup-open:bg-white/10 dark:bg-transparent [&_svg]:text-white/50";

// Dark popups sized to their content, so long labels are never cut.
const popupClass =
  "w-auto min-w-[max(var(--anchor-width),11rem)] bg-neutral-950 p-1 text-[#f2f1ec] shadow-xl ring-white/10";
const itemClass =
  "gap-6 rounded-md py-1.5 pl-2 text-[13px] focus:bg-white/10 focus:text-white not-data-[variant=destructive]:focus:**:text-white";

export type ComposerState = {
  text: string;
  /** Message filled in by a preset or an example: greyed out, sent while the field is empty. */
  suggestedText: string;
  presetId: string | null;
  choices: Choice[];
  models: [ModelId, ModelId];
  mode: "form" | "raw";
};

type Props = {
  state: ComposerState;
  onChange: (next: ComposerState) => void;
  onSend: () => void;
  busy: boolean;
  availability: Partial<Record<ModelId, Availability>>;
  connections: Connection[];
  /** Only given on a hosted copy of the site: a local installation is configured with .env.local. */
  onConnect?: () => void;
};

export function Composer({ state, onChange, onSend, busy, availability, connections, onConnect }: Props) {
  const { text, suggestedText, presetId, choices, models, mode } = state;
  const referenceModels = [
    ...baselineModels(availability),
    ...connections.map((c) => ({ id: connectionModelId(c) as ModelId, label: c.label })),
    // Shown only while nothing can answer: a dash, until a model is connected.
    ...(models[1] === "none" ? [{ id: "none" as ModelId, label: "– –" }] : []),
  ];
  const canSend = models[1] !== "none" && (text.trim() || suggestedText).length > 0 && choices.some((c) => c.options.length >= 2);
  const [focusChoice, setFocusChoice] = useState<string | null>(null);
  // Command on a Mac, Ctrl elsewhere. Read after mount so server and client render the same HTML.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the platform is only known in the browser
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform));
  }, []);
  // Bumped on every change made outside the JSON editor, so it reloads its document.
  const [revision, setRevision] = useState(0);

  const set = (patch: Partial<ComposerState>) => {
    onChange({ ...state, ...patch });
    setRevision((r) => r + 1);
  };

  function applyPreset(id: string | null) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    set({
      presetId: preset.id,
      suggestedText: preset.example,
      choices: choicesFrom(preset.choices),
    });
  }

  function applyRandom() {
    set(randomScenario(text.trim() || suggestedText));
  }

  function updateChoice(id: string, patch: Partial<Choice>) {
    onChange({ ...state, choices: choices.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }

  function addChoice() {
    const id = crypto.randomUUID();
    set({ choices: [...choices, { id, question: "", options: [] }] });
    setFocusChoice(id);
  }

  function applySource(source: string) {
    const result = parseContractJson(source, state);
    if (!result.ok) return result.error;
    onChange({ ...state, ...result.state });
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <Toolbar>
          <Select
            items={toItems(wispModels(availability), availability)}
            value={models[0]}
            onValueChange={(v) => v && onChange({ ...state, models: [v as ModelId, models[1]] })}
          >
            <SelectTrigger size="sm" className={triggerClass} aria-label="Wisp model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start" className={popupClass}>
              {wispModels(availability).map((m) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  disabled={availability[m.id]?.state === "unavailable" && models[0] !== m.id}
                  className={itemClass}
                >
                  <ModelOption label={m.label} status={availability[m.id]} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="px-1 font-mono text-[11px] text-white/35">vs</span>
          <Select
            items={toItems(referenceModels, availability)}
            value={models[1]}
            onValueChange={(v) => v && onChange({ ...state, models: [models[0], v as ModelId] })}
          >
            <SelectTrigger size="sm" className={triggerClass} aria-label="Reference model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start" className={popupClass}>
              {referenceModels.map((m) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  disabled={availability[m.id]?.state === "unavailable" && models[1] !== m.id}
                  className={itemClass}
                >
                  <ModelOption label={m.label} status={availability[m.id]} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onConnect && (
            <>
              <ToolbarDivider />
              <button
                type="button"
                onClick={onConnect}
                aria-label="Connect models"
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 max-sm:px-2 font-mono text-[11px] text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/20 outline-none"
              >
                <PlugIcon className="size-3.5" />
                <span className="max-sm:sr-only">Connect</span>
              </button>
            </>
          )}
        </Toolbar>

        <Toolbar>
          <div role="radiogroup" aria-label="Editing mode" className="flex">
            {(["form", "raw"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => set({ mode: m })}
                className={cn(
                  "h-7 rounded-md px-2 font-mono text-[11px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                  mode === m ? "bg-white/15 text-white" : "text-white/45 hover:text-white/80",
                )}
              >
                {m === "form" ? "Form" : "JSON"}
              </button>
            ))}
          </div>
          <ToolbarDivider />
          <Select
            items={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            value={presetId}
            onValueChange={(v) => applyPreset(v as string | null)}
          >
            <SelectTrigger size="sm" className={triggerClass} aria-label="Preset">
              <SelectValue placeholder="Preset" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="end" className={popupClass}>
              {PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className={itemClass}>
                  {p.label}
                  <span className="ml-auto font-mono text-[10px] text-white/40">{p.datasetTask}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon-sm"
            className="ml-0.5 rounded-md bg-[#f2f1ec] text-black hover:bg-white"
            aria-label="Reset"
            title="Reset"
            onClick={() => {
              set({ text: "", suggestedText: "", presetId: null, choices: [] });
            }}
          >
            <XIcon />
          </Button>
        </Toolbar>
      </div>

      <motion.div
        layout
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-xl bg-[#f2f1ec] text-black"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
          >
        {mode === "raw" ? (
          <RawEditor key={revision} initial={toContractJson(state)} onSource={applySource} />
        ) : (
          <div className="px-4 pt-3">
            <Textarea
              value={text}
              onChange={(e) => onChange({ ...state, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend && !busy) onSend();
              }}
              placeholder={suggestedText || "e.g. content to evaluate…"}
              aria-label="Content to evaluate"
              className={cn(
                "max-h-56 min-h-20 resize-none rounded-none border-0 border-b border-black/10 bg-transparent px-0 pt-1 pb-2 text-[17px] leading-6 text-black focus-visible:border-black/30 focus-visible:ring-0 md:text-[17px] dark:bg-transparent",
                suggestedText ? "placeholder:text-black/45" : "placeholder:text-black/30",
              )}
            />

            {choices.length > 0 && (
              <div className="flex flex-col gap-1 pt-2">
                {choices.map((choice) => (
                  <ChoiceRow
                    key={choice.id}
                    choice={choice}
                    autoFocus={choice.id === focusChoice}
                    onChange={(patch) => updateChoice(choice.id, patch)}
                    onRemove={() => set({ choices: choices.filter((c) => c.id !== choice.id) })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-2.5 pt-2 pb-2.5">
          <div className="flex items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-md text-black/60 hover:bg-black/[0.06] hover:text-black"
              onClick={applyRandom}
            >
              <DicesIcon data-icon="inline-start" />
              Example
            </Button>
            {mode === "form" && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-md text-black/60 hover:bg-black/[0.06] hover:text-black"
                onClick={addChoice}
              >
                <PlusIcon data-icon="inline-start" />
                Question
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <KbdGroup className="max-sm:hidden" aria-label={`${isMac ? "Command" : "Control"} plus Enter sends`}>
              <Kbd className="bg-black/[0.06] text-black/45">{isMac ? "⌘" : "Ctrl"}</Kbd>
              <Kbd className="bg-black/[0.06] text-black/45">↵</Kbd>
            </KbdGroup>
            <Button
              size="icon"
              className="rounded-lg bg-black text-[#f2f1ec] hover:bg-black/80 disabled:bg-black/20 disabled:opacity-100"
              disabled={!canSend || busy}
              onClick={onSend}
              aria-label="Run comparison"
            >
              <ArrowUpIcon />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Categories are identifiers: no inner spaces, upper snake case. */
function normalizeOption(raw: string) {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "_").replace(/[^\p{L}\p{N}_]/gu, "");
}

// Each field reads as a line to write on.
const lineClass = "border-b border-black/10 transition-colors focus-within:border-black/35";

function ChoiceRow({
  choice,
  autoFocus,
  onChange,
  onRemove,
}: {
  choice: Choice;
  autoFocus: boolean;
  onChange: (patch: Partial<Choice>) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState("");
  const draftRef = useRef<HTMLInputElement>(null);
  // The badge being renamed, and its text while it is edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  function startEdit(option: string) {
    setEditing(option);
    setEditDraft(option);
  }

  /** Rename in place. An empty name removes the badge; a name already used merges into that badge. */
  function commitEdit(cancel = false) {
    if (editing === null) return;
    const next = normalizeOption(editDraft);
    setEditing(null);
    if (cancel || next === editing) return;
    if (!next) {
      onChange({ options: choice.options.filter((o) => o !== editing) });
      return;
    }
    const renamed = choice.options.map((o) => (o === editing ? next : o));
    onChange({ options: renamed.filter((o, i) => renamed.indexOf(o) === i) });
  }

  function commit() {
    const option = normalizeOption(draft);
    if (option && !choice.options.includes(option)) {
      onChange({ options: [...choice.options, option] });
    }
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Space and Enter both turn the draft into a badge; focus stays here for the next one.
    if (e.key === " " || e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && choice.options.length) {
      onChange({ options: choice.options.slice(0, -1) });
    }
  }

  return (
    <div className="group/row flex flex-col sm:flex-row sm:items-end sm:gap-4">
      <input
        value={choice.question}
        autoFocus={autoFocus}
        onChange={(e) => onChange({ question: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            draftRef.current?.focus();
          }
        }}
        placeholder={choice.suggested || "e.g. your question"}
        aria-label="Question"
        className={cn(
          lineClass,
          "h-9 w-full shrink-0 bg-transparent text-sm sm:w-48 font-medium text-black outline-none placeholder:font-normal focus:border-black/35",
          choice.suggested ? "placeholder:text-black/45" : "placeholder:text-black/30",
        )}
      />
      <div
        className={cn(lineClass, "flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1.5")}
        onClick={() => draftRef.current?.focus()}
      >
        {choice.options.map((option) => (
          <Badge
            key={option}
            variant="secondary"
            className="h-6 rounded-md bg-black/[0.07] pr-1 pl-2 font-mono text-[11px] text-black"
          >
            {editing === option ? (
              <input
                autoFocus
                value={editDraft}
                size={Math.max(editDraft.length, 3)}
                aria-label={`Rename ${option}`}
                onChange={(e) => setEditDraft(e.target.value.replace(/\s+/g, "_"))}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => commitEdit()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " " || e.key === ",") {
                    e.preventDefault();
                    commitEdit();
                    draftRef.current?.focus();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    commitEdit(true);
                  }
                }}
                className="min-w-0 bg-transparent font-mono text-[11px] text-black uppercase outline-none"
              />
            ) : (
              <button
                type="button"
                title="Click to rename"
                aria-label={`Rename ${option}`}
                className="cursor-text rounded-sm hover:underline hover:decoration-black/30 hover:underline-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(option);
                }}
              >
                {option}
              </button>
            )}
            <button
              type="button"
              aria-label={`Remove ${option}`}
              className="rounded-sm text-black/35 hover:text-black"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ options: choice.options.filter((o) => o !== option) });
              }}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={draftRef}
          value={draft}
          onChange={(e) => {
            // Pasted text with spaces becomes several badges at once.
            const parts = e.target.value.split(/\s+/);
            const rest = parts.pop() ?? "";
            const added = parts.map(normalizeOption).filter((o) => o && !choice.options.includes(o));
            if (added.length) onChange({ options: [...new Set([...choice.options, ...added])] });
            setDraft(rest);
          }}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={choice.options.length === 0 ? "e.g. ALLOW BLOCK" : choice.options.length === 1 ? "another…" : ""}
          aria-label="Add an option"
          className="h-6 min-w-20 flex-1 bg-transparent font-mono text-[11px] text-black uppercase outline-none placeholder:text-black/30"
        />
        <Button
          size="icon-xs"
          variant="ghost"
          className="ml-auto rounded-md text-black/30 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 hover:bg-black/[0.06] hover:text-black max-sm:opacity-100"
          aria-label="Remove question"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
