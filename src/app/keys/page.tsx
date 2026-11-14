import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { benchmarkRepoUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to connect safely · Wisp Benchmark",
  description: "Connect a model to Wisp Benchmark and create a key with a spending limit.",
};

const heading = "font-mono text-[12px] uppercase tracking-wide text-white/45";
const link = "underline underline-offset-4 hover:text-white";

type Provider = {
  name: string;
  keys: { label: string; href: string };
  docs: { label: string; href: string };
  steps: string[];
  note?: string;
};

const PROVIDERS: Provider[] = [
  {
    name: "OpenRouter",
    keys: { label: "openrouter.ai/settings/keys", href: "https://openrouter.ai/settings/keys" },
    docs: { label: "API authentication", href: "https://openrouter.ai/docs/api_reference/authentication" },
    steps: [
      "Open the keys page and choose to create a key.",
      "Give it a name, for example “wisp-benchmark”.",
      "Set a credit limit, a few dollars is plenty for a comparison.",
      "Set an expiration date (one day to a few days). It is fixed when the key is created and cannot be changed afterwards.",
      "Copy the key, paste it in Connect, and delete the key from the dashboard when you are done.",
    ],
    note: "The limit and the expiration belong to the key itself, which makes OpenRouter the simplest one to restrict.",
  },
  {
    name: "OpenAI",
    keys: { label: "platform.openai.com/api-keys", href: "https://platform.openai.com/api-keys" },
    docs: { label: "Managing projects", href: "https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform" },
    steps: [
      "Create a dedicated project, for example “wisp-benchmark”.",
      "In the project's limits, set a small monthly budget and turn on the hard limit, so requests stop when it is reached.",
      "Create a key inside that project, set it to Restricted and allow only what you need (model requests), and set an expiration date if your dashboard offers one.",
      "Copy the key, paste it in Connect, and delete it when you are done.",
    ],
    note: "OpenAI's budget applies to the project, not to a single key. A project used only for this test is how you get a key-sized limit.",
  },
  {
    name: "Anthropic (Claude)",
    keys: { label: "platform.claude.com/settings/keys", href: "https://platform.claude.com/settings/keys" },
    docs: { label: "Workspaces", href: "https://platform.claude.com/docs/en/manage-claude/workspaces" },
    steps: [
      "Create a dedicated workspace, for example “wisp-benchmark”.",
      "In that workspace's spend limits, set a small monthly limit (it must be lower than your organization's limit).",
      "Create the API key inside that workspace.",
      "Copy the key, paste it in Connect, and delete it when you are done.",
    ],
    note: "The default workspace cannot have its own limit, so use a new one. The limit belongs to the workspace, not to the key.",
  },
  {
    name: "Google Gemini",
    keys: { label: "aistudio.google.com/apikey", href: "https://aistudio.google.com/apikey" },
    docs: { label: "Billing", href: "https://ai.google.dev/gemini-api/docs/billing" },
    steps: [
      "Use a dedicated project, for example “wisp-benchmark”.",
      "On the Spend page, set a monthly spend cap for that project.",
      "Create the key for that project.",
      "Copy the key, paste it in Connect, and delete it when you are done.",
    ],
    note: "All keys of a project share its cap, and usage can overrun the cap slightly (Google mentions about ten minutes). The free tier has no spend at all.",
  },
];

const STEPS = [
  { src: "/guide/guide-1-connect.png", w: 1648, h: 584, alt: "The Connect button next to the model selectors", caption: "1. Press Connect, next to the model selectors." },
  { src: "/guide/guide-2-form.png", w: 1280, h: 1264, narrow: true, alt: "The Connect dialog with the add form filled in", caption: "2. Pick the provider, enter the model name and your key, then Add and test. The key stays in this tab unless you tick the remember box." },
  { src: "/guide/guide-3-list.png", w: 1648, h: 464, alt: "The model list showing the connected model", caption: "3. Your connection now appears in the model list. Select it and run a comparison." },
];

export default function Keys() {
  return (
    <main className="min-h-svh bg-black px-5 py-16 text-[#f2f1ec] sm:px-8">
      <div className="mx-auto w-full max-w-2xl text-[15px] leading-7">
        <Link href="/" className="font-mono text-[12px] text-white/50 hover:text-white">
          ← Wisp Benchmark
        </Link>
        <h1 className="mt-6 text-2xl font-medium">How to connect safely</h1>
        <p className="mt-3 text-white/70">
          Wisp Benchmark calls the models from your browser, with your own key. This page shows how to connect one, and how
          to create a key that can only spend a little and only for a short time.
        </p>

        <h2 className={`mt-10 ${heading}`}>Connect a model</h2>
        <ol className="mt-4 flex flex-col gap-8">
          {STEPS.map((step) => (
            <li key={step.src}>
              <p className="text-white/70">{step.caption}</p>
              <Image
                src={step.src}
                alt={step.alt}
                unoptimized
                width={step.w}
                height={step.h}
                className={`mt-3 h-auto w-full rounded-lg border border-white/10 ${step.narrow ? "mx-auto max-w-[34rem]" : ""}`}
              />
            </li>
          ))}
        </ol>
        <p className="mt-4 text-white/70">
          A Wisp runtime on your own machine needs no connection: the page finds it on ports 8781 to 8785. Ollama and other
          local servers must allow requests from this site (for Ollama, start it with{" "}
          <code className="font-mono text-[13px] text-white">OLLAMA_ORIGINS</code> set to this site&apos;s address).
        </p>

        <h2 className={`mt-12 ${heading}`}>Create a key that can only do a little</h2>
        <p className="mt-3 text-white/70">
          A key kept in a browser can be read by anything running on the page or by anyone using your device. So make it
          small: a low spending limit, a short life, and delete it afterwards. The dashboards change, so the exact labels
          may differ; the official pages are linked for each provider.
        </p>
        <div className="mt-6 flex flex-col gap-8">
          {PROVIDERS.map((provider) => (
            <section key={provider.name}>
              <h3 className="text-[16px] font-medium">{provider.name}</h3>
              <p className="mt-1 font-mono text-[12px] text-white/50">
                <a className={link} href={provider.keys.href} target="_blank" rel="noreferrer">
                  {provider.keys.label}
                </a>
                {" · "}
                <a className={link} href={provider.docs.href} target="_blank" rel="noreferrer">
                  {provider.docs.label}
                </a>
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-white/70">
                {provider.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {provider.note && <p className="mt-2 text-[13px] leading-6 text-white/50">{provider.note}</p>}
            </section>
          ))}
        </div>

        <h2 className={`mt-12 ${heading}`}>Good habits</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-white/70">
          <li>One key per test, deleted afterwards.</li>
          <li>Leave “Remember this key on this device” off: the key then disappears when you close the tab.</li>
          <li>Do not paste data you are not allowed to share with the model you connect.</li>
          <li>To keep everything on your own machine, run Wisp locally instead.</li>
        </ul>
        <p className="mt-8 text-[13px] leading-6 text-white/45">
          Provided as is, without warranty or maintenance. See the{" "}
          <Link className={link} href="/privacy">
            privacy page
          </Link>
          . Found a mistake in this guide? Open an issue on{" "}
          <a className={link} href={`${benchmarkRepoUrl}/issues`} target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </div>
    </main>
  );
}
