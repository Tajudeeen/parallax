import type { ReactNode } from "react";

export function Panel({
  children,
  raised = false,
  style,
}: {
  children: ReactNode;
  raised?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: raised ? "var(--surface-panel-raised)" : "var(--surface-panel)",
        border: "1px solid var(--surface-border)",
        borderRadius: 6,
        padding: "var(--space-6)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
