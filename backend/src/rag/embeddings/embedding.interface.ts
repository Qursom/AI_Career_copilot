export interface EmbeddingProvider {
  readonly name: string;
  /**
   * Length of the vectors this provider emits. Ingestion and retrieval must
   * agree on it, and the Qdrant collection is created from it, so it belongs
   * to the provider rather than to whichever caller happens to read config.
   */
  readonly dimensions: number;
  embedText(text: string): Promise<number[]>;
}
