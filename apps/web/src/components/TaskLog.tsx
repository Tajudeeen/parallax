import type { OrchestratorTask } from "../api/client.js";
import { StatusDot, type SignalState } from "./ui/StatusDot.js";

function stateFor(task: OrchestratorTask): SignalState {
  if (task.status === "completed") return "ready";
  if (task.status === "failed") return "error";
  return "processing";
}

export function TaskLog({ tasks, onSelect }: { tasks: OrchestratorTask[]; onSelect: (task: OrchestratorTask) => void }) {
  if (tasks.length === 0) {
    return (
      <div style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)" }}>
        No tasks run yet this session. Compose one above.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      {tasks
        .slice()
        .reverse()
        .map((task) => (
          <button
            key={task.id}
            onClick={() => onSelect(task)}
            className="mono"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              background: "none",
              border: "none",
              borderBottom: "1px solid var(--surface-border)",
              padding: "var(--space-2) 0",
              color: "var(--text-secondary)",
              fontSize: "var(--text-xs)",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <StatusDot state={stateFor(task)} />
            <span style={{ color: "var(--text-tertiary)" }}>
              {new Date(task.createdAt).toLocaleTimeString()}
            </span>
            <span style={{ color: "var(--text-primary)", minWidth: 70 }}>{task.engine}</span>
            <span>{task.status}</span>
          </button>
        ))}
    </div>
  );
}
