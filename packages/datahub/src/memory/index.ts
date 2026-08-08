import type { MemoryScope } from "@parallax/types";

export interface MemoryService {
  get(scope: MemoryScope, key: string): Promise<unknown>;
  set(scope: MemoryScope, key: string, value: unknown): Promise<void>;
  all(scope: MemoryScope): Promise<Record<string, unknown>>;
}

/**
 * In-memory implementation, one Map per scope. Milestone 2 backs this with
 * the database package instead of a Map, same three methods.
 */
class InMemoryMemoryService implements MemoryService {
  private store: Record<MemoryScope, Map<string, unknown>> = {
    user: new Map(),
    project: new Map(),
    system: new Map(),
  };

  async get(scope: MemoryScope, key: string): Promise<unknown> {
    return this.store[scope].get(key);
  }

  async set(scope: MemoryScope, key: string, value: unknown): Promise<void> {
    this.store[scope].set(key, value);
  }

  async all(scope: MemoryScope): Promise<Record<string, unknown>> {
    return Object.fromEntries(this.store[scope]);
  }
}

export function createMemoryService(): MemoryService {
  return new InMemoryMemoryService();
}
