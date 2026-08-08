import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "var(--text-sm)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderRadius: 4,
    padding: "var(--space-3) var(--space-6)",
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.5 : 1,
    border: "1px solid transparent",
    transition: "background var(--duration-fast) var(--ease-instrument)",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--signal-ready)",
      color: "#06110f",
      border: "1px solid var(--signal-ready)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid var(--surface-border-strong)",
    },
  };

  return <button {...props} style={{ ...base, ...variants[variant], ...style }} />;
}
