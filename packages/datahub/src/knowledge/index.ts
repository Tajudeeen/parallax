export interface KnowledgeNode {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: string;
}

export interface KnowledgeService {
  addNode(node: KnowledgeNode): Promise<void>;
  addEdge(edge: KnowledgeEdge): Promise<void>;
  neighbors(nodeId: string): Promise<KnowledgeNode[]>;
}

/**
 * In-memory graph, adjacency-list style. Milestone 2 decides whether this
 * moves to a real graph store; the interface is what Atlas and Prism will
 * actually depend on, so that decision won't ripple outward.
 */
class InMemoryKnowledgeService implements KnowledgeService {
  private nodes = new Map<string, KnowledgeNode>();
  private edges: KnowledgeEdge[] = [];

  async addNode(node: KnowledgeNode): Promise<void> {
    this.nodes.set(node.id, node);
  }

  async addEdge(edge: KnowledgeEdge): Promise<void> {
    this.edges.push(edge);
  }

  async neighbors(nodeId: string): Promise<KnowledgeNode[]> {
    const neighborIds = this.edges
      .filter((e) => e.from === nodeId)
      .map((e) => e.to);
    return neighborIds
      .map((id) => this.nodes.get(id))
      .filter((n): n is KnowledgeNode => Boolean(n));
  }
}

export function createKnowledgeService(): KnowledgeService {
  return new InMemoryKnowledgeService();
}
