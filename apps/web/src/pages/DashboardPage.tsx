import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext.js";
import { api, type EngineName, type OrchestratorTask } from "../api/client.js";
import { EngineRail } from "../components/EngineRail.js";
import { TaskComposer } from "../components/TaskComposer.js";
import { TaskResultCard } from "../components/TaskResultCard.js";
import { TaskLog } from "../components/TaskLog.js";
import { Panel } from "../components/ui/Panel.js";
import { Button } from "../components/ui/Button.js";
import { StatusDot } from "../components/ui/StatusDot.js";

export function DashboardPage() {
  const { user, token, logout } = useAuth();
  const [selectedEngine, setSelectedEngine] = useState<EngineName>("atlas");
  const [tasks, setTasks] = useState<OrchestratorTask[]>([]);
  const [activeTask, setActiveTask] = useState<OrchestratorTask | null>(null);

  const runTask = useMutation({
    mutationFn: (input: unknown) => api.runEngine(selectedEngine, input, token!),
    onSuccess: (task) => {
      setTasks((prev) => [...prev, task]);
      setActiveTask(task);
    },
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100%" }}>
      <aside
        style={{
          borderRight: "1px solid var(--surface-border)",
          padding: "var(--space-6) var(--space-4)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "var(--text-lg)" }}>PARALLAX</h1>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
            {user?.email}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          <StatusDot state="ready" />
          orchestrator connected
        </div>

        <EngineRail
          selected={selectedEngine}
          onSelect={setSelectedEngine}
          activeEngine={runTask.isPending ? selectedEngine : null}
        />

        <div style={{ marginTop: "auto" }}>
          <Button variant="ghost" onClick={logout} style={{ width: "100%" }}>
            Sign out
          </Button>
        </div>
      </aside>

      <main style={{ padding: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-8)", overflowY: "auto" }}>
        <section>
          <h2 style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            Compose task
          </h2>
          <Panel>
            <TaskComposer
              engine={selectedEngine}
              submitting={runTask.isPending}
              onSubmit={(input) => runTask.mutate(input)}
            />
          </Panel>
        </section>

        {activeTask && (
          <section>
            <h2 style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
              Result
            </h2>
            <TaskResultCard task={activeTask} />
          </section>
        )}

        <section>
          <h2 style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            Task log
          </h2>
          <Panel>
            <TaskLog tasks={tasks} onSelect={setActiveTask} />
          </Panel>
        </section>
      </main>
    </div>
  );
}
