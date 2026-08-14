import { PineconeRetrievalService } from './pinecone-retrieval.service';

describe('PineconeRetrievalService', () => {
  it('returns an empty context when RAG is disabled', async () => {
    const config = { get: (key: string) => key === 'RAG_ENABLED' ? false : undefined } as any;
    const service = new PineconeRetrievalService({} as any, config);
    await expect(service.retrieve('backend engineer')).resolves.toEqual([]);
  });
});
