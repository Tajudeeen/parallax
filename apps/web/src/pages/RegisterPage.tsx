import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { Panel } from "../components/ui/Panel.js";
import { Input, Label } from "../components/ui/Input.js";
import { Button } from "../components/ui/Button.js";

export function RegisterPage() {
  const { register, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(email, password);
      navigate("/");
    } catch {
      // error is already surfaced via auth context
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100%", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <h1 style={{ fontSize: "var(--text-xl)" }}>PARALLAX</h1>
          <div style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", marginTop: "var(--space-2)" }}>
            create a console account
          </div>
        </div>
        <Panel>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
                at least 8 characters
              </div>
            </div>
            {error && (
              <div style={{ color: "var(--signal-error)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
                {error}
              </div>
            )}
            <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Panel>
        <div style={{ textAlign: "center", marginTop: "var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
