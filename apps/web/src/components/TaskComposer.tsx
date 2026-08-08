import { useState } from "react";
import type { EngineName } from "../api/client.js";
import { Button } from "./ui/Button.js";
import { Label } from "./ui/Input.js";

const EXAMPLES: Record<EngineName, string> = {
  atlas: JSON.stringify({ goal: "Plan the next sprint", constraints: ["2 weeks", "solo builder"] }, null, 2),
  prism: JSON.stringify({ records: [{ latency: 120 }, { latency: 340 }, { latency: 95 }] }, null, 2),
  sentinel: JSON.stringify(
    { payload: { amount: 100 }, rules: [{ field: "amount", required: true }, { field: "currency", required: true }] },
    null,
    2,
  ),
  echo: JSON.stringify({ audience: "user", data: "Task completed successfully" }, null, 2),
};

export function TaskComposer({
  engine,
  onSubmit,
  submitting,
}: {
  engine: EngineName;
  onSubmit: (input: unknown) => void;
  submitting: boolean;
}) {
  const [raw, setRaw] = useState(EXAMPLES[engine]);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleEngineExample() {
    setRaw(EXAMPLES[engine]);
    setParseError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const parsed = JSON.parse(raw);
      setParseError(null);
      onSubmit(parsed);
    } catch {
      setParseError("That's not valid JSON. Fix the syntax and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label>{`Task input for ${engine}`}</Label>
        <button
          type="button"
          onClick={handleEngineExample}
          style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: "var(--text-xs)", cursor: "pointer" }}
        >
          reset to example
        </button>
      </div>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={8}
        style={{
          width: "100%",
          background: "var(--surface-base)",
          border: `1px solid ${parseError ? "var(--signal-error)" : "var(--surface-border-strong)"}`,
          borderRadius: 4,
          padding: "var(--space-3)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-sm)",
          resize: "vertical",
        }}
      />
      {parseError && (
        <div style={{ color: "var(--signal-error)", fontSize: "var(--text-xs)", marginTop: "var(--space-2)" }}>
          {parseError}
        </div>
      )}
      <div style={{ marginTop: "var(--space-4)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Running…" : `Run on ${engine}`}
        </Button>
      </div>
    </form>
  );
}
