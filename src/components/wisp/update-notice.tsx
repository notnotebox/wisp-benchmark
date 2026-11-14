"use client";

import { useEffect, useState } from "react";

import type { UpdateInfo } from "@/app/api/update/route";
import type { DetectedWisp } from "@/lib/local-wisp";
import { isNewer, parseVersion } from "@/lib/version";

/** Top-left note when something newer exists. Renders nothing when everything is up to date. */
export function UpdateNotice({ detected }: { detected: DetectedWisp[] | null }) {
  const [info, setInfo] = useState<UpdateInfo>({});

  useEffect(() => {
    let active = true;
    fetch("/api/update", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<UpdateInfo>) : {}))
      .catch(() => ({}))
      .then((next) => {
        if (active) setInfo(next);
      });
    return () => {
      active = false;
    };
  }, []);

  // A newer Wisp model matters only to someone who already runs one: nothing is shown otherwise.
  const newestLocal = (detected ?? [])
    .map((m) => parseVersion(m.id))
    .filter((v): v is [number, number, number] => v !== null)
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
  const wispIsNewer = info.wisp && newestLocal && isNewer(info.wisp.latest, newestLocal.join("."));

  const notice = info.benchmark
    ? { text: `Update available · Wisp Benchmark v${info.benchmark.latest}`, url: info.benchmark.url }
    : wispIsNewer && info.wisp
      ? { text: `New model · ${info.wisp.label}`, url: info.wisp.url }
      : null;
  if (!notice) return null;

  return (
    <a
      href={notice.url}
      target="_blank"
      rel="noreferrer"
      className="absolute left-5 top-4 z-30 inline-flex items-center gap-1.5 font-mono text-[12px] leading-4 text-black/55 transition-colors hover:text-black sm:left-8"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-amber-600" />
      {notice.text}
    </a>
  );
}
