import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background: "var(--surface-base)",
        border: "1px solid var(--surface-border-strong)",
        borderRadius: 4,
        padding: "var(--space-3)",
        color: "var(--text-primary)",
        width: "100%",
        ...props.style,
      }}
    />
  );
}

export function Label({ children }: { children: string }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: "var(--text-xs)",
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "var(--space-2)",
      }}
    >
      {children}
    </label>
  );
}
