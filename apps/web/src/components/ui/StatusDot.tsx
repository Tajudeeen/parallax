export type SignalState = "ready" | "processing" | "error" | "neutral";

const colors: Record<SignalState, string> = {
  ready: "var(--signal-ready)",
  processing: "var(--signal-processing)",
  error: "var(--signal-error)",
  neutral: "var(--signal-neutral)",
};

export function StatusDot({ state, pulse = false }: { state: SignalState; pulse?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: colors[state],
        boxShadow: pulse ? `0 0 0 3px ${colors[state]}22` : undefined,
        animation: pulse ? "parallax-pulse 1.4s ease-in-out infinite" : undefined,
      }}
    />
  );
}

// Injected once, globally, since keyframes can't live in inline styles.
const styleTag = document.createElement("style");
styleTag.textContent = `
@keyframes parallax-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`;
if (!document.getElementById("parallax-pulse-keyframes")) {
  styleTag.id = "parallax-pulse-keyframes";
  document.head.appendChild(styleTag);
}
