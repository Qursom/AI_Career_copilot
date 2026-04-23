import { normalizePineconeDataHost } from './pinecone-vector.store';

describe('normalizePineconeDataHost', () => {
  it('strips https and trailing slash', () => {
    expect(
      normalizePineconeDataHost(
        'https://copilot-job-yck97gb.svc.aped-4627-b74a.pinecone.io/',
      ),
    ).toBe('copilot-job-yck97gb.svc.aped-4627-b74a.pinecone.io');
  });
});
