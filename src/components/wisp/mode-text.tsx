"use client";

import { useEffect, useState, type ReactNode } from "react";

import { isHostedBenchmark } from "@/lib/benchmark-mode";

/** Shows the text that fits this copy of the site: hosted online, or running on the visitor's own machine. */
export function ModeText({ hosted, local }: { hosted: ReactNode; local: ReactNode }) {
  const [mode, setMode] = useState<"unknown" | "hosted" | "local">("unknown");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the host name is only known in the browser
    setMode(isHostedBenchmark() ? "hosted" : "local");
  }, []);
  // The hosted text is the server-rendered default; it stays invisible until the mode is known.
  return <span className={mode === "unknown" ? "invisible" : undefined}>{mode === "local" ? local : hosted}</span>;
}
