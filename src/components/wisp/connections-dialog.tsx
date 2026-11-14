"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlugIcon, Trash2Icon, XIcon } from "lucide-react";

import {
  DEFAULT_URL,
  FIXED_URL,
  KIND_LABEL,
  MODEL_PLACEHOLDER,
  NEEDS_KEY,
  testConnection,
  type Connection,
  type ConnectionKind,
} from "@/lib/connections";
import { ModeText } from "@/components/wisp/mode-text";
import { benchmarkRepoUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  connections: Connection[];
  onChange: (next: Connection[]) => void;
};

const field =
  "h-8 w-full rounded-md border border-white/15 bg-black px-2.5 font-mono text-[12px] text-[#f2f1ec] outline-none placeholder:text-white/30 focus:border-white/40 disabled:opacity-50";
const button =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 font-mono text-[12px] transition-colors disabled:opacity-40";

const HINT: Record<ConnectionKind, string> = {
  ollama:
    "No key needed. Enter the model name exactly as ollama list shows it. Ollama refuses calls from websites by default. Start it with OLLAMA_ORIGINS set to this site's address (for example OLLAMA_ORIGINS=https://your-site.vercel.app), then test.",
  compatible:
    "Works with LM Studio, llama.cpp, vLLM, Mistral (https://api.mistral.ai/v1) and any server that offers /v1/chat/completions. It must allow requests from this site (CORS).",
  openai: "Calls api.openai.com straight from your browser, with your own key.",
  anthropic: "Calls api.anthropic.com straight from your browser, with your own key.",
  gemini: "Calls Google's Gemini API (its OpenAI-compatible endpoint) straight from your browser, with your own key.",
  openrouter: "Calls openrouter.ai straight from your browser, with your own key. Jev models use the decisions endpoint.",
};

export function ConnectionsDialog({ open, onClose, connections, onChange }: Props) {
  const [kind, setKind] = useState<ConnectionKind>("openrouter");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState(DEFAULT_URL.openrouter);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [formStatus, setFormStatus] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const needsKey = NEEDS_KEY[kind];
  const candidate = (): Connection => ({
    id: crypto.randomUUID(),
    kind,
    label: label.trim() || model.trim(),
    url: url.trim().replace(/\/$/, ""),
    model: model.trim(),
    apiKey: apiKey.trim() || undefined,
    remember: needsKey && remember && apiKey.trim().length > 0,
  });
  const valid = model.trim().length > 0 && url.trim().length > 0 && (!needsKey || apiKey.trim().length > 0);

  function pickKind(next: ConnectionKind) {
    setKind(next);
    setUrl(DEFAULT_URL[next]);
    setFormStatus("");
  }

  async function add() {
    const connection = candidate();
    setFormStatus("Testing…");
    const result = await testConnection(connection);
    setFormStatus(result.ok ? `Works (${result.ms} ms).` : `${result.message} Added anyway, you can fix it and test again.`);
    onChange([...connections, connection]);
    setLabel("");
    setModel("");
    setApiKey("");
  }

  async function retest(connection: Connection) {
    setStatus((s) => ({ ...s, [connection.id]: "Testing…" }));
    const result = await testConnection(connection);
    setStatus((s) => ({ ...s, [connection.id]: result.ok ? `Works (${result.ms} ms)` : result.message }));
  }

  function setKey(connection: Connection, key: string) {
    onChange(connections.map((c) => (c.id === connection.id ? { ...c, apiKey: key || undefined } : c)));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect models"
        className="max-h-[90svh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-black p-5 text-[#f2f1ec] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-medium">
              <PlugIcon className="size-4 text-white/60" /> Connect models
            </h2>
            <p className="mt-1.5 text-[13px] leading-5 text-white/60">
              Your browser talks to the model directly. This site&apos;s server makes no request for you and never sees
              your texts or keys. A Wisp runtime on this machine (ports 8781 to 8785) is detected on its own.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/50 hover:text-white">
            <XIcon className="size-4" />
          </button>
        </div>

        {connections.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {connections.map((c) => (
              <li key={c.id} className="rounded-lg border border-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]">{c.label}</div>
                    <div className="truncate font-mono text-[11px] text-white/45">
                      {KIND_LABEL[c.kind]} · {c.model}
                      {FIXED_URL[c.kind] ? "" : ` · ${c.url}`}
                      {NEEDS_KEY[c.kind] ? (c.remember ? " · key kept on this device" : " · key kept for this tab only") : ""}
                    </div>
                  </div>
                  <button type="button" onClick={() => retest(c)} className={cn(button, "border border-white/15 hover:bg-white/10")}>
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(connections.filter((x) => x.id !== c.id))}
                    aria-label={`Remove ${c.label}`}
                    className={cn(button, "px-2 text-white/60 hover:text-white")}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
                {NEEDS_KEY[c.kind] && !c.apiKey && (
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Key not set for this tab: paste it again to use this connection"
                    onChange={(e) => setKey(c, e.target.value.trim())}
                    className={cn(field, "mt-2")}
                  />
                )}
                {status[c.id] && <div className="mt-1 font-mono text-[11px] text-white/55">{status[c.id]}</div>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 rounded-lg border border-white/10 p-3">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-white/40">Add a connection</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select value={kind} onChange={(e) => pickKind(e.target.value as ConnectionKind)} className={field} aria-label="Type">
              {(Object.keys(KIND_LABEL) as ConnectionKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name (optional)" className={field} />
            {!FIXED_URL[kind] && (
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Address" className={cn(field, "sm:col-span-2")} />
            )}
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={MODEL_PLACEHOLDER[kind]}
              className={cn(field, kind === "ollama" && "sm:col-span-2")}
            />
            {kind !== "ollama" && (
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                autoComplete="off"
                placeholder={needsKey ? "API key (required)" : "API key (optional)"}
                className={field}
              />
            )}
          </div>
          <p className="mt-2 text-[12px] leading-5 text-white/50">{HINT[kind]}</p>
          {needsKey && (
            <>
              <label className="mt-2 flex items-start gap-2 text-[12px] leading-5 text-white/60">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-1" />
                <span>
                  Remember this key on this device. Off by default: the key then lives in this tab only and is gone when you close it.
                </span>
              </label>
              <p className="mt-1.5 text-[12px] leading-5 text-white/50">
                Use a key with a low spending limit, and revoke it from the provider&apos;s dashboard when you are done.{" "}
                <Link className="underline underline-offset-2 hover:text-white" href="/keys">
                  How to create one
                </Link>
                .
              </p>
            </>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              disabled={!valid}
              onClick={add}
              className={cn(button, "shrink-0 whitespace-nowrap bg-[#f2f1ec] text-black hover:bg-white")}
            >
              Add and test
            </button>
            {formStatus && (
              <span className="basis-full font-mono text-[11px] leading-4 text-white/55 sm:basis-0 sm:flex-1">{formStatus}</span>
            )}
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-4 text-white/40">
          <ModeText
            hosted=""
            local="Running locally: models can also be set in .env.local (see the README). "
          />
          Provided as is, with no warranty, no maintenance and no guarantee that it works or stays reliable. You are
          responsible for your keys, for what you send to the models you connect, and for those providers&apos; terms and
          costs. To be sure of what happens to your data, run Wisp on your own machine. Bugs: open an issue on GitHub.
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-white/45">
          <span className="flex gap-4">
            <Link className="hover:text-white" href="/keys">
              How to connect safely
            </Link>
            <Link className="hover:text-white" href="/privacy">
              Privacy
            </Link>
            <a className="hover:text-white" href={benchmarkRepoUrl} target="_blank" rel="noreferrer">
              Source code
            </a>
          </span>
          {connections.length > 0 && (
            <button type="button" className="hover:text-white" onClick={() => onChange([])}>
              Remove all and forget keys
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
