import { eq, and } from "drizzle-orm";
import type { MemoryScope } from "@parallax/types";
import { getDb, schema } from "@parallax/database";
import type { MemoryService } from "./index.js";

/**
 * Same MemoryService contract as the in-memory version. DataHub, and
 * anything that calls DataHub, doesn't know or care which one is behind
 * the interface.
 */
export class PersistentMemoryService implements MemoryService {
  async get(scope: MemoryScope, key: string): Promise<unknown> {
    const [row] = await getDb()
      .select()
      .from(schema.memoryEntries)
      .where(and(eq(schema.memoryEntries.scope, scope), eq(schema.memoryEntries.key, key)));
    return row?.value;
  }

  async set(scope: MemoryScope, key: string, value: unknown): Promise<void> {
    await getDb()
      .insert(schema.memoryEntries)
      .values({ scope, key, value: value as object, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [schema.memoryEntries.scope, schema.memoryEntries.key],
        set: { value: value as object, updatedAt: new Date() },
      });
  }

  async all(scope: MemoryScope): Promise<Record<string, unknown>> {
    const rows = await getDb()
      .select()
      .from(schema.memoryEntries)
      .where(eq(schema.memoryEntries.scope, scope));
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
}

export function createPersistentMemoryService(): MemoryService {
  return new PersistentMemoryService();
}
