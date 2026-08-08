import type { BaseEngine, EngineName } from "@parallax/types";
import { EngineNotFoundError } from "@parallax/shared";

/**
 * Holds every engine the Orchestrator knows about. Registration is
 * explicit and happens at startup, not through auto-discovery, so it's
 * always obvious which engines are live in a given deployment.
 */
export class EngineRegistry {
  private engines = new Map<EngineName, BaseEngine>();

  register(engine: BaseEngine): void {
    this.engines.set(engine.descriptor.name, engine);
  }

  get(name: EngineName): BaseEngine {
    const engine = this.engines.get(name);
    if (!engine) {
      throw new EngineNotFoundError(name);
    }
    return engine;
  }

  list(): EngineName[] {
    return [...this.engines.keys()];
  }

  async initializeAll(): Promise<void> {
    await Promise.all([...this.engines.values()].map((e) => e.initialize()));
  }

  async shutdownAll(): Promise<void> {
    await Promise.all([...this.engines.values()].map((e) => e.shutdown()));
  }
}
