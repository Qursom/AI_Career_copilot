import { RagIngestionService } from './rag-ingestion.service';
import type { TypedConfigService } from '../../config/typed-config.service';
import type { EmbeddingService } from '../embeddings/embedding.service';
import { NoopVectorStore } from '../vector/noop-vector.store';

describe('RagIngestionService', () => {
  const embeddings = {
    embedText: jest.fn().mockResolvedValue([0.1, 0.2]),
  } as unknown as EmbeddingService;
  const config = {
    get: () => 768,
  } as unknown as TypedConfigService;

  it('normalizes records and removes invalid entries', () => {
    const service = new RagIngestionService(
      embeddings,
      new NoopVectorStore(),
      config,
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

  it('skips upsert when no vector store is configured', async () => {
    const service = new RagIngestionService(
      embeddings,
      new NoopVectorStore(),
      config,
    );
    const result = await service.ingestPublicDatasets();

    expect(result.processed).toBe(0);
    expect(result.upserted).toBe(0);
  });
});
