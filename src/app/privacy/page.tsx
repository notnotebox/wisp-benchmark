import type { Metadata } from "next";

import Link from "next/link";

import { ModeText } from "@/components/wisp/mode-text";
import { benchmarkRepoUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy · Wisp Benchmark",
  description: "Wisp Benchmark collects nothing. Everything you enter stays in your browser.",
};

const section = "mt-10";
const heading = "font-mono text-[12px] uppercase tracking-wide text-white/45";

export default function Privacy() {
  return (
    <main className="min-h-svh bg-black px-5 py-16 text-[#f2f1ec] sm:px-8">
      <div className="mx-auto w-full max-w-2xl text-[15px] leading-7">
        <Link href="/" className="font-mono text-[12px] text-white/50 hover:text-white">
          ← Wisp Benchmark
        </Link>
        <h1 className="mt-6 text-2xl font-medium">
          <ModeText hosted="Privacy" local="Local privacy" />
        </h1>
        <p className="mt-3 text-white/70">
          <ModeText
            hosted="Short version: we collect nothing and we store nothing. Everything you type, connect or compare stays in your browser."
            local="Short version: this copy runs on your own computer. Nothing is hosted, collected or stored by us. Everything you type, connect or compare stays on your machine."
          />
        </p>

        <h2 className={cn(section, heading)}>What this site does not do</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-white/70">
          <li>No account, no sign-up, no email.</li>
          <li>No cookies, no analytics, no tracking, no advertising.</li>
          <li>No database. The texts you test and the answers you get are never saved on a server.</li>
          <li>No shared key. The site never provides or uses an API key of its own for you.</li>
        </ul>

        <h2 className={cn(section, heading)}>What stays in your browser</h2>
        <p className="mt-3 text-white/70">
          If you connect a model, its name and address are kept in your browser&apos;s local storage on this device. An API
          key is kept for the current tab only and disappears when you close it, unless you tick &quot;Remember this key
          on this device&quot;. Nothing is ever sent to this site&apos;s server. You can remove one connection, use
          &quot;Remove all and forget keys&quot; in the Connect window, or clear this site&apos;s data in your browser
          settings. Either way it is deleted. A key stored in a browser can be read by anything that runs on this page
          or by anyone with access to your device, so use keys with a low spending limit and revoke them when you are
          done.
        </p>

        <h2 className={cn(section, heading)}>Where your requests go</h2>
        <p className="mt-3 text-white/70">
          <ModeText
            hosted="When you run a comparison, your browser sends the text directly to the models you chose: a Wisp runtime or other server on your own machine, or a provider you connected yourself (for example OpenRouter, with your own key). This site's server does not receive, relay or log those texts. What a provider you connect does with the request is governed by that provider's own terms and privacy policy."
            local="A Wisp runtime or other model on your machine: the text never leaves your computer. A provider you connect (for example OpenRouter or OpenAI, with your own key): your browser, or this local server if you set the provider in .env.local, sends the text to that provider, and its own terms and privacy policy apply. Nothing is sent to us."
          />
        </p>

        <h2 className={cn(section, heading)}>Hosting</h2>
        <p className="mt-3 text-white/70">
          <ModeText
            hosted="The page is served by a hosting provider. Like any web host, it may keep standard technical logs (such as IP address and request time) for security and operation. We do not access them to identify anyone, and we add no other collection on top. The server also reads a small public file on GitHub, about once an hour, to know whether a newer version exists; it sends no visitor information."
            local="None. This copy runs on your computer: there is no hosting provider and no remote server of ours involved. The one outgoing request is a check, about once an hour, of a small public file on GitHub to see whether a newer version exists; it sends no data from you, and you can turn it off with WISP_BENCH_UPDATE_CHECK=off."
          />
        </p>

        <h2 className={cn(section, heading)}>Your rights</h2>
        <p className="mt-3 text-white/70">
          Since we hold no personal data about you, there is nothing to access, correct or erase on our side. If you have
          a question or concern, open an issue on{" "}
          <a className="underline underline-offset-4 hover:text-white" href={`${benchmarkRepoUrl}/issues`} target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>

        <h2 className={cn(section, heading)}>No warranty, no maintenance</h2>
        <p className="mt-3 text-white/70">
          Wisp Benchmark is a free experiment, provided as is, without warranty of any kind. There is no maintenance
          commitment and no guarantee that the site works, stays available, is stable or is reliable. If you find a bug,
          please open an issue on{" "}
          <a className="underline underline-offset-4 hover:text-white" href={`${benchmarkRepoUrl}/issues`} target="_blank" rel="noreferrer">
            GitHub
          </a>
          ; it may or may not be fixed.
        </p>
        <p className="mt-3 text-white/70">
          We make no request on your behalf: you are responsible for your API keys, for the content you send to the
          models you connect, for the terms of those providers, and for any cost they charge. Results are for
          comparison only and are not a guarantee of how a model will behave in production.
        </p>
        <p className="mt-3 text-white/70">
          <ModeText
            hosted="If you want to be sure of what happens to your data, run the Wisp model on your own machine: it is open source and made to run locally. This benchmark site is hosted online, and its code is open source too, so you can also run your own copy."
            local="You are running Wisp Benchmark locally, which is the most private way to use it."
          />{" "}
          To limit the risk with a key, see{" "}
          <Link className="underline underline-offset-4 hover:text-white" href="/keys">
            how to create a key with a spending limit
          </Link>
          .
        </p>

        <h2 className={cn(section, heading)}>Open source</h2>
        <p className="mt-3 text-white/70">
          The whole site is open source, so you can check all of this in the code:{" "}
          <a className="underline underline-offset-4 hover:text-white" href={benchmarkRepoUrl} target="_blank" rel="noreferrer">
            notnotebox/wisp-benchmark
          </a>
          . Wisp Benchmark is a testing tool, not a moderation service: do not paste data you are not allowed to share
          with the models you connect.
        </p>
      </div>
    </main>
  );
}

function cn(...parts: string[]) {
  return parts.join(" ");
}
