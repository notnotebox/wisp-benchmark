# Providers and examples

Wisp v0.1.2 is an experimental release. The routes below connect to its trained adapter or to external model services; provider availability and compatibility vary by setup.

This page is the detailed reference for how Wisp Benchmark talks to each model: what to put in
`.env.local`, what a working example looks like, and where your text travels. The
[README](README.md) has the short version.

Wisp Benchmark is local-first. It only uses real model routes and labels them honestly; when a provider
is offline it says so instead of inventing an answer.

## Wisp runtime (the first-class route)

Start a Wisp v0.1.2 4B runtime. The native Rust/Candle server is the main one (Windows with CUDA, from the
[Wisp repository](https://github.com/notnotebox/wisp): `scripts\prepare_candle.ps1`, then
`scripts\start_candle.ps1`). It listens on `127.0.0.1:8782`.

A Python server (`wisp-decide serve`, port `8781`) also exists as a secondary option, for machines where the
Rust server cannot run. Both publish `GET /health`, `GET /v1/models` and `POST /decide`.

The page probes `/v1/models` directly from your browser. Local Wisp calls never go through a hosting provider.

## The request you can paste (Form / JSON)

The top of the page has a **Form / JSON** switch. JSON mode shows exactly what will be sent, and you can edit
it or paste your own. This is the whole format:

```json
{
  "task": "moderation",
  "text": "I will find your address and make you pay.",
  "questions": [
    { "question": "Human review required?", "options": ["REVIEW", "NO_ACTION", "NEED_CONTEXT"] },
    { "question": "Category", "options": ["INSULT", "THREAT", "HARASSMENT", "HATE", "SEXUAL", "DOXXING", "OTHER", "NONE"] }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `task` | `moderation`, `report_validity`, `username`, or `null` for a custom task |
| `text` | what to judge: a chat message, a username, a report (1 to 4,000 characters) |
| `questions` | one or more closed questions (up to 8) |
| `questions[].question` | the question, up to 200 characters |
| `questions[].options` | the allowed answers: 2 to 12, each up to 60 characters, without spaces (use `NO_ACTION`, not `no action`) |

Every model gets the same text, the same question and the same options in the same order.

## Optional routes, with examples

Everything below goes in `.env.local` (copy `.env.example` first). Set only what you use, then restart the app.

### Ollama

```bash
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODELS=qwen3.5:4b,qwen3.5:9b
```

Each model listed in `OLLAMA_MODELS` shows up by name in the model menu, with "Ollama" in grey next to it.
The models must already be installed (`ollama pull qwen3.5:4b`). Local use only.

### OpenAI-compatible endpoint

For any server or service that speaks the OpenAI `/chat/completions` format: LM Studio, llama.cpp, vLLM,
LiteLLM, or OpenAI itself.

```bash
# a local server (LM Studio's default address), no key needed
OPENAI_COMPATIBLE_URL=http://127.0.0.1:1234/v1
OPENAI_COMPATIBLE_MODEL=qwen3.5-4b
```

```bash
# OpenAI's own API: create a key in your OpenAI account (platform.openai.com), then
OPENAI_COMPATIBLE_URL=https://api.openai.com/v1
OPENAI_COMPATIBLE_MODEL=<a model name from your OpenAI account>
OPENAI_COMPATIBLE_API_KEY=<your key>
```

### OpenRouter (one key, many models, including Claude)

[OpenRouter](https://openrouter.ai) is a service that reaches many providers with one key: Anthropic (Claude),
OpenAI, Qwen and others. Create a key at openrouter.ai/keys, pick a model on openrouter.ai/models, and copy its
id exactly (the format is `provider/model-name`).

```bash
OPENROUTER_API_KEY=<your key, starts with sk-or->
OPENROUTER_MODEL=typesafe/jev-1.13
```

That is the example we use: **Jev**, the typed-decision model from TypeSafe AI, which is the natural reference to
put next to Wisp. The app recognizes Jev ids (`typesafe/jev-1.13`, or just `jev-1.13`) and sends them to
OpenRouter's decisions endpoint, which answers with a probability for each of your options.

Any other OpenRouter model works too, for example a Claude model: set `OPENROUTER_MODEL=anthropic/<model-name>`
and copy the exact id from openrouter.ai/models. A regular chat model is asked for a short JSON answer:

```json
{ "decision": "REVIEW", "confidence": 0.9 }
```

and the app turns that into the result card. For chat models the confidence is the one the model reported about
itself, so it is shown as **model-reported confidence**, never as a probability.

### Claude (Anthropic) directly

Anthropic API keys come from the Claude Console (platform.claude.com/settings/keys). Anthropic also offers an
OpenAI-compatible endpoint at `https://api.anthropic.com/v1/`, meant for testing Claude.

At the moment **this app cannot use it directly**: the app asks the provider for a free JSON answer
(`response_format: json_object`), and Anthropic's compatible endpoint rejects that setting (it accepts only a
strict `json_schema`) with an HTTP 400 error. To compare Claude today, reach it through OpenRouter as above.

## Where your text goes

- **Wisp (local runtime):** your browser sends the request directly to the runtime on your machine.
- **Ollama and local servers:** when you run the app on your own machine, its server route calls them, so the
  route is your machine. On a hosted copy of the site, add them with **Connect** instead: your browser calls
  them directly.
- **Remote providers (OpenRouter, OpenAI, others):** with `.env.local` on your own machine, the app's route
  forwards the text and the question to the provider. On a hosted copy of the site, add the provider with
  **Connect** and your own key: the request goes from your browser to the provider, never through the site's
  server. The key stays in your browser's local storage. Do not send sensitive content to a provider you do not
  trust.

Chat providers return a constrained JSON decision and their own confidence. They do not expose Wisp-style
logits, so their confidence is shown as **model-reported confidence**, not a calibrated probability.

## What this tool is for

Wisp Benchmark is a focused workbench for putting two models side by side on the same request and inspecting
their answers across the supported use cases (chat moderation, report validity and usernames). The interactive
view is intended for exploration. Use frozen cases and the accompanying benchmark runners when you need
repeatable aggregate measurements.

It is released under the Apache-2.0 licence: take it, change it, build on it. If you turn it into a more
serious tool, a mention of this project is appreciated.

To keep it simple, the public version launches no process, bundles no third-party model, has no analytics and
never shows a made-up answer. The only thing it looks for on its own is a Wisp runtime on your machine, on ports
8781 to 8785. It ships no shared provider key, and you should not set one on a public copy: visitors would spend it.
