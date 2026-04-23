import { RagIngestionService } from './rag-ingestion.service';
import type { EmbeddingService } from '../embeddings/embedding.service';
import type { PineconeVectorStore } from '../vector/pinecone-vector.store';

describe('RagIngestionService', () => {
  it('normalizes records and removes invalid entries', () => {
    const service = new RagIngestionService(
      {
        embedText: jest.fn(),
      } as unknown as EmbeddingService,
      {
        upsert: jest.fn(),
      } as unknown as PineconeVectorStore,
    );

    const out = service.normalizeRecords([
      {
        id: '  a  ',
        role: ' Backend Engineer ',
        skill: ' Node.js ',
        importance: 'core',
        evidence: ' important skill ',
        sourceName: ' O*NET ',
        sourceUrl: ' https://www.onetonline.org/ ',
      },
      {
        id: '',
        role: 'x',
        skill: 'y',
        importance: 'important',
        evidence: 'z',
        sourceName: 'n',
        sourceUrl: 'u',
      },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      role: 'Backend Engineer',
      skill: 'Node.js',
      evidence: 'important skill',
      sourceName: 'O*NET',
      sourceUrl: 'https://www.onetonline.org/',
    });
  });

  it('embeds normalized records and upserts vectors', async () => {
    const upsert = jest.fn().mockResolvedValue(2);
    const service = new RagIngestionService(
      {
        embedText: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      } as unknown as EmbeddingService,
      {
        upsert,
      } as unknown as PineconeVectorStore,
    );

    const result = await service.ingestPublicDatasets();

    expect(result.processed).toBeGreaterThan(1);
    expect(result.upserted).toBe(2);
    expect(upsert).toHaveBeenCalled();
  });
});
