import type { OrchestratorTask } from "../api/client.js";
import { StatusDot, type SignalState } from "./ui/StatusDot.js";
import { useParallaxTilt } from "../hooks/useParallaxTilt.js";

function stateFor(task: OrchestratorTask): SignalState {
  if (task.status === "completed") return "ready";
  if (task.status === "failed") return "error";
  return "processing";
}

export function TaskResultCard({ task }: { task: OrchestratorTask }) {
  const { ref, offset } = useParallaxTilt(5);
  const state = stateFor(task);

  return (
    <div ref={ref} style={{ position: "relative", padding: "var(--space-2)" }}>
      {/* Ghost layer: the second, displaced view. Outline only, tinted by status. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "var(--space-2)",
          border: `1px solid ${state === "ready" ? "var(--signal-ready-dim)" : state === "error" ? "var(--signal-error-dim)" : "var(--signal-processing-dim)"}`,
          borderRadius: 6,
          transform: `translate(${offset.x + 4}px, ${offset.y + 4}px)`,
          transition: "transform var(--duration-fast) var(--ease-instrument)",
          pointerEvents: "none",
        }}
      />
      {/* Front layer: the actual content, displaced the opposite way for real parallax */}
      <div
        style={{
          position: "relative",
          background: "var(--surface-panel-raised)",
          border: "1px solid var(--surface-border-strong)",
          borderRadius: 6,
          padding: "var(--space-4)",
          transform: `translate(${offset.x * -0.4}px, ${offset.y * -0.4}px)`,
          transition: "transform var(--duration-fast) var(--ease-instrument)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <StatusDot state={state} pulse={state === "processing"} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-sm)" }}>
              {task.engine.toUpperCase()}
            </span>
          </div>
          <span className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
            {task.id.slice(0, 8)}
          </span>
        </div>

        <div style={{ marginTop: "var(--space-3)" }}>
          {task.result?.success === false && (
            <div style={{ color: "var(--signal-error)", fontSize: "var(--text-sm)" }}>{task.result.error}</div>
          )}
          {task.result?.output !== undefined && (
            <pre
              className="mono"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                margin: 0,
                marginTop: "var(--space-2)",
              }}
            >
              {JSON.stringify(task.result.output, null, 2)}
            </pre>
          )}
          {!task.result && <div style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>Running…</div>}
        </div>

        {task.result?.durationMs !== undefined && (
          <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
            {task.result.durationMs}ms
          </div>
        )}
      </div>
    </div>
  );
}
