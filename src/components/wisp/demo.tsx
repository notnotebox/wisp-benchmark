"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion } from "motion/react";

import { Composer, type ComposerState } from "@/components/wisp/composer";
import { BrokenHorizon } from "@/components/wisp/horizon";
import { randomScenario } from "@/lib/examples";
import { cellKey, PairHeader, RunBand, type Cell, type Run } from "@/components/wisp/result-card";
import { baselineModels, isWisp, PRESETS, questionOf, type Availability, type CompareEvent, type CompareRequest, type ModelId, type ModelStatuses } from "@/lib/wisp";
import { decideWispLocal, detectLocalWisps, type DetectedWisp } from "@/lib/local-wisp";
import { UpdateNotice } from "@/components/wisp/update-notice";
import { isHostedBenchmark } from "@/lib/benchmark-mode";
import { ConnectionsDialog } from "@/components/wisp/connections-dialog";
import { connectionModelId, decideConnection, loadConnections, saveConnections, type Connection } from "@/lib/connections";

const initialPreset = PRESETS[0];

/** Consecutive comparisons made with the same model pair. */
type Section = { id: string; models: [ModelId, ModelId]; runs: Run[] };

const samePair = (a: [ModelId, ModelId], b: [ModelId, ModelId]) => a[0] === b[0] && a[1] === b[1];

export function Benchmark() {
  const [composer, setComposer] = useState<ComposerState>({
    text: "",
    suggestedText: "",
    presetId: initialPreset.id,
    choices: initialPreset.choices.map((c, i) => ({
      id: `initial-${i}`,
      question: "",
      suggested: c.question,
      options: [...c.options],
    })),
    mode: "form",
    models: ["wisp", "none"],
  });
  // null while the local runtimes are being probed.
  const [localWisps, setLocalWisps] = useState<DetectedWisp[] | null>(null);
  const hostedBenchmark = typeof window !== "undefined" && isHostedBenchmark();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ModelStatuses | null>(null);
  // One timeline, newest first. Switching models opens a new section on top; the old ones stay.
  const [sections, setSections] = useState<Section[]>([]);
  const [busy, setBusy] = useState(false);
  const [diveRequest, setDiveRequest] = useState(0);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);

  // Land on a random scenario. Picked after mount so server and client render the same HTML.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random pick must happen client-side, once
    setComposer((current) => ({ ...current, ...randomScenario() }));
  }, []);

  // Connections live in this browser's localStorage and are read after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available in the browser
    setConnections(loadConnections());
  }, []);

  function updateConnections(next: Connection[]) {
    setConnections(next);
    saveConnections(next);
  }

  // This request runs in the visitor's browser, never on Vercel. It is what
  // makes a hosted benchmark page able to use the visitor's local Wisp runtime.
  useEffect(() => {
    let active = true;
    void detectLocalWisps().then((found) => {
      if (!active) return;
      setLocalWisps(found);
      // Start on a detected Wisp model rather than the "none detected" placeholder.
      setComposer((current) => {
        const wanted = found.length > 0 ? found.map((m) => m.id) : isHostedBenchmark() ? ["wisp-v0.1.2-4b"] : [];
        return wanted.length > 0 && !wanted.includes(current.models[0])
          ? { ...current, models: [wanted[0] as ModelId, current.models[1]] }
          : current;
      });
    });
    return () => {
      active = false;
    };
  }, []);

  // Which reference models are configured and reachable, checked by the server.
  useEffect(() => {
    let active = true;
    fetch("/api/models", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<ModelStatuses>) : null))
      .catch(() => null)
      .then((statuses) => {
        if (!active || !statuses) return;
        setProviderStatuses(statuses);
      });
    return () => {
      active = false;
    };
  }, []);

  // Start on a reference model that can answer. With none available, show a dash until one is connected.
  useEffect(() => {
    if (!providerStatuses) return;
    const connectionIds = connections.map((c) => connectionModelId(c) as ModelId);
    const usable = (id: ModelId) =>
      id.startsWith("conn:") ? connectionIds.includes(id) : (providerStatuses[id]?.state ?? "unavailable") !== "unavailable";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the availability reported by the server and the connections
    setComposer((current) => {
      if (usable(current.models[1])) return current;
      const next = [...baselineModels(providerStatuses).map((m) => m.id), ...connectionIds].find(usable) ?? "none";
      return next === current.models[1] ? current : { ...current, models: [current.models[0], next] };
    });
  }, [providerStatuses, connections]);

  const availability: Partial<Record<ModelId, Availability>> = {
    ...(providerStatuses ?? Object.fromEntries(baselineModels(null).map((m) => [m.id, { state: "checking", detail: "Checking" }]))),
    ...wispAvailability(localWisps, hostedBenchmark),
    ...Object.fromEntries(
      connections.map((c): [ModelId, Availability] => [
        connectionModelId(c) as ModelId,
        { state: "ready", detail: c.label, name: c.label, via: `${c.kind} · browser` },
      ]),
    ),
  };

  useLayoutEffect(() => {
    const node = composerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setComposerHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // "Camera dive": bring the composer to the top; the newest band sits right below it.
  useEffect(() => {
    if (!diveRequest || !composerRef.current) return;
    const target = composerRef.current.getBoundingClientRect().top + window.scrollY - 24;
    if (Math.abs(window.scrollY - target) < 4) return;
    const controls = animate(window.scrollY, target, {
      duration: 0.9,
      ease: [0.83, 0, 0.17, 1],
      onUpdate: (y) => window.scrollTo(0, y),
    });
    return () => controls.stop();
  }, [diveRequest]);

  async function send() {
    // Greyed-out suggestions are sent as-is when the user has not typed over them.
    const choices = composer.choices
      .filter((c) => c.options.length >= 2)
      .map((c) => ({ id: c.id, question: questionOf(c), options: [...c.options] }));
    const preset = PRESETS.find((p) => p.id === composer.presetId);
    const wispId = composer.models.find(isWisp);
    const wisp = localWisps?.find((m) => m.id === wispId);
    const request: CompareRequest = {
      text: composer.text.trim() || composer.suggestedText,
      task: preset?.task ?? null,
      models: composer.models,
      choices,
      // Models run by the browser (a local Wisp runtime, connections) are skipped by the server.
      skipModels: [
        ...(wispId && (wisp || !hostedBenchmark) ? [wispId] : []),
        ...composer.models.filter((m) => m.startsWith("conn:")),
      ],
    };

    const runId = crypto.randomUUID();
    const pending: Record<string, Cell> = {};
    for (const model of request.models) {
      for (const choice of choices) pending[cellKey(model, choice.id)] = { status: "pending" };
    }
    setSections((prev) => {
      const [latest, ...older] = prev;
      if (latest && samePair(latest.models, request.models)) {
        const run: Run = { id: runId, index: latest.runs.length + 1, text: request.text, choices, models: request.models, cells: pending };
        return [{ ...latest, runs: [run, ...latest.runs] }, ...older];
      }
      const run: Run = { id: runId, index: 1, text: request.text, choices, models: request.models, cells: pending };
      return [{ id: crypto.randomUUID(), models: request.models, runs: [run] }, ...prev];
    });
    setDiveRequest((n) => n + 1);
    setBusy(true);

    const patchRun = (fn: (run: Run) => Run) =>
      setSections((prev) =>
        prev.map((section) =>
          section.runs.some((run) => run.id === runId)
            ? { ...section, runs: section.runs.map((run) => (run.id === runId ? fn(run) : run)) }
            : section,
        ),
      );
    const update = (cell: string, value: Cell) =>
      patchRun((run) => ({ ...run, cells: { ...run.cells, [cell]: value } }));

    const runLocalWisp = async () => {
      if (!wispId) return;
      if (!wisp) {
        if (hostedBenchmark) return;
        for (const choice of choices) {
          update(cellKey(wispId, choice.id), {
            status: "error",
            message: "No Wisp model detected. Start one with `wisp-decide serve --port 8782` (see the README), then refresh.",
          });
        }
        return;
      }
      for (const choice of choices) {
        try {
          const result = await decideWispLocal(wisp.url, {
            task: request.task,
            text: request.text,
            question: choice.question,
            options: choice.options,
          });
          update(cellKey(wispId, choice.id), { status: "done", result });
        } catch (error) {
          update(cellKey(wispId, choice.id), {
            status: "error",
            message: error instanceof Error ? error.message : "Wisp local returned an error.",
          });
        }
      }
    };

    const runConnections = async () => {
      for (const model of new Set(request.models)) {
        const connection = connections.find((c) => connectionModelId(c) === model);
        if (!connection) continue;
        for (const choice of choices) {
          try {
            const result = await decideConnection(connection, {
              task: request.task,
              text: request.text,
              question: choice.question,
              options: choice.options,
            });
            update(cellKey(model, choice.id), { status: "done", result });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Request failed";
            update(cellKey(model, choice.id), {
              status: "error",
              message: /failed to fetch|networkerror|load failed/i.test(message)
                ? "Could not reach this connection from the browser. Open Connect and test it."
                : message,
            });
          }
        }
      }
    };

    let localRun: Promise<void> | undefined;
    let connectionRun: Promise<void> | undefined;
    try {
      const remoteRun = fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      localRun = runLocalWisp();
      connectionRun = runConnections();
      const response = await remoteRun;
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as CompareEvent;
          if (event.type === "result") {
            update(cellKey(event.model, event.choiceId), { status: "done", result: event.result });
          } else if (event.type === "skipped" && !isWisp(event.model)) {
            update(cellKey(event.model, event.choiceId), { status: "skipped", message: event.message });
          } else if (event.type === "error") {
            update(cellKey(event.model, event.choiceId), { status: "error", message: event.message });
          }
        }
      }
      await localRun;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      patchRun((run) => ({
        ...run,
        cells: Object.fromEntries(
          Object.entries(run.cells).map(([k, c]) => [k, c.status === "pending" ? { status: "error", message } : c]),
        ),
      }));
    } finally {
      await localRun?.catch(() => undefined);
      await connectionRun?.catch(() => undefined);
      setBusy(false);
    }
  }

  // Composer card sits on the two-thirds line (model/preset row just above it), but is lifted
  // when its rows would push it into the corner links. The horizon follows it, just above.
  const composerTop = `max(40svh, min(calc(66.67svh - 2.75rem), calc(100svh - ${composerHeight}px - 4.5rem)))`;

  return (
    <>
    <UpdateNotice detected={localWisps} />
    <ConnectionsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} connections={connections} onChange={updateConnections} />
    <BrokenHorizon top={`calc(${composerTop} - 3.5rem - min(11svh, 12vw))`} />
    <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6" style={{ paddingTop: composerTop }}>
      <div ref={composerRef} className="mx-auto w-full max-w-3xl">
        <Composer
          state={composer}
          onChange={setComposer}
          onSend={send}
          busy={busy}
          availability={availability}
          connections={connections}
          onConnect={() => setDialogOpen(true)}
        />
      </div>

      {sections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 flex flex-col gap-12"
          // The page itself scrolls; the minimum height only lets the dive lift the composer to the top.
          style={{ minHeight: `calc(100svh - ${composerHeight}px - 7rem)` }}
        >
          {sections.map((section) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <PairHeader models={section.models} names={availability} />
              <div className="flex flex-col gap-6">
                {section.runs.map((run) => (
                  <RunBand key={run.id} run={run} names={availability} />
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>
      )}
    </div>
    </>
  );
}

/** One entry per detected Wisp model; a single placeholder entry when there is none. */
function wispAvailability(found: DetectedWisp[] | null, hosted: boolean): Partial<Record<ModelId, Availability>> {
  if (found === null) return { wisp: { state: "checking", detail: "Checking" } };
  if (found.length > 0) {
    return Object.fromEntries(
      found.map((m): [ModelId, Availability] => [
        m.id as ModelId,
        { state: "ready", detail: m.label, name: m.label, via: m.source },
      ]),
    );
  }
  return hosted
    ? { "wisp-v0.1.2-4b": { state: "unavailable", detail: "Not found on this machine", name: "Wisp v0.1.2 4B" } }
    : { wisp: { state: "unavailable", detail: "No Wisp model detected" } };
}
