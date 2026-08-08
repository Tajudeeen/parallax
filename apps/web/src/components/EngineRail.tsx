import type { EngineName } from "../api/client.js";
import { StatusDot } from "./ui/StatusDot.js";

const ENGINES: { name: EngineName; label: string; role: string }[] = [
  { name: "atlas", label: "Atlas", role: "reasoning" },
  { name: "prism", label: "Prism", role: "analysis" },
  { name: "sentinel", label: "Sentinel", role: "security" },
  { name: "echo", label: "Echo", role: "communication" },
];

export function EngineRail({
  selected,
  onSelect,
  activeEngine,
}: {
  selected: EngineName;
  onSelect: (engine: EngineName) => void;
  activeEngine: EngineName | null;
}) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {ENGINES.map((engine) => {
        const isSelected = engine.name === selected;
        const isActive = engine.name === activeEngine;
        return (
          <button
            key={engine.name}
            onClick={() => onSelect(engine.name)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: isSelected ? "var(--surface-panel-raised)" : "transparent",
              border: "1px solid",
              borderColor: isSelected ? "var(--surface-border-strong)" : "transparent",
              borderRadius: 4,
              padding: "var(--space-3)",
              textAlign: "left",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <span>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-sm)" }}>
                {engine.label.toUpperCase()}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{engine.role}</div>
            </span>
            <StatusDot state={isActive ? "processing" : "ready"} pulse={isActive} />
          </button>
        );
      })}
    </nav>
  );
}
