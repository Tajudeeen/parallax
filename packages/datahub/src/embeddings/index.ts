export interface EmbeddingProvider {
  name: string;
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Deterministic placeholder provider so the rest of DataHub has something
 * real to call during Milestone 1. Milestone 5 swaps this for an actual
 * embedding model behind the AI abstraction layer, no callers change.
 */
class StubEmbeddingProvider implements EmbeddingProvider {
  name = "stub";

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const vector = new Array(8).fill(0);
      for (let i = 0; i < text.length; i++) {
        vector[i % 8] += text.charCodeAt(i);
      }
      return vector;
    });
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  return new StubEmbeddingProvider();
}
