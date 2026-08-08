import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../api/client.js";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "parallax.auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user);
        setToken(parsed.token);
        setStatus("authenticated");
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setStatus("unauthenticated");
  }, []);

  function persist(nextUser: AuthUser, nextToken: string) {
    setUser(nextUser);
    setToken(nextToken);
    setStatus("authenticated");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  }

  async function login(email: string, password: string) {
    setError(null);
    try {
      const result = await api.login(email, password);
      persist(result.user, result.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      throw err;
    }
  }

  async function register(email: string, password: string) {
    setError(null);
    try {
      const result = await api.register(email, password);
      persist(result.user, result.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
      throw err;
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    setStatus("unauthenticated");
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, status, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
