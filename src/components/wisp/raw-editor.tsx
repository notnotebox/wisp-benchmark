"use client";

import { useState } from "react";
import { json } from "@codemirror/lang-json";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";

const theme = EditorView.theme({
  "&": { backgroundColor: "transparent", fontSize: "13px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", lineHeight: "1.6" },
  ".cm-content": { padding: "14px 0", caretColor: "#000" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "rgba(0,0,0,0.25)" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgba(0,0,0,0.035)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(0,0,0,0.1) !important" },
});

const extensions = [json(), theme, EditorView.lineWrapping];

/**
 * JSON view of the composer. Valid edits are pushed up as they are typed; an invalid
 * document stays local and shows its error until it parses again.
 */
export default function RawEditor({
  initial,
  onSource,
}: {
  initial: string;
  /** Returns an error message when the source cannot be applied. */
  onSource: (source: string) => string | null;
}) {
  const [source, setSource] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <CodeMirror
        value={source}
        onChange={(next) => {
          setSource(next);
          setError(onSource(next));
        }}
        theme="none"
        extensions={extensions}
        basicSetup={{ foldGutter: false, highlightActiveLineGutter: true, autocompletion: false }}
        maxHeight="14rem"
        aria-label="JSON request"
      />
      <p className="mx-4 min-h-5 truncate font-mono text-[11px] text-red-700/80">
        {error}
      </p>
    </div>
  );
}
