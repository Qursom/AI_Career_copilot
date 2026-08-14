import { RagIngestionService } from './rag-ingestion.service';

describe('RagIngestionService', () => {
  it('normalizes records and removes invalid entries', () => {
    const service = new RagIngestionService();

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
    const service = new RagIngestionService();
    const result = await service.ingestPublicDatasets();

    expect(result.processed).toBe(0);
    expect(result.upserted).toBe(0);
  });
});
