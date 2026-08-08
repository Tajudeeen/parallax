/**
 * A connector wraps one external system (a file store, a CRM, a chain
 * indexer, whatever comes later) behind the same shape, so DataHub's
 * ingestion layer never needs to know which connector it's talking to.
 */
export interface Connector {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export class ConnectorRegistry {
  private connectors = new Map<string, Connector>();

  register(connector: Connector): void {
    if (this.connectors.has(connector.name)) {
      throw new Error(`Connector "${connector.name}" is already registered`);
    }
    this.connectors.set(connector.name, connector);
  }

  get(name: string): Connector | undefined {
    return this.connectors.get(name);
  }

  list(): string[] {
    return [...this.connectors.keys()];
  }
}
