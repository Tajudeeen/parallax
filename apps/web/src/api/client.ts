const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed with status ${res.status}`, res.status);
  }

  return body as T;
}

export interface AuthResponse {
  user: { id: string; email: string };
  token: string;
}

export type EngineName = "atlas" | "prism" | "sentinel" | "echo";

export interface OrchestratorTask {
  id: string;
  engine: EngineName;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  result?: {
    success: boolean;
    output?: unknown;
    error?: string;
    durationMs?: number;
  };
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  runEngine: (engine: EngineName, input: unknown, token: string) =>
    request<OrchestratorTask>(
      `/engines/${engine}/run`,
      { method: "POST", body: JSON.stringify(input) },
      token,
    ),

  getTask: (id: string, token: string) => request<OrchestratorTask>(`/tasks/${id}`, {}, token),
};
