import { MemoryJobMatchStore } from './memory-job-match.store';
import type { MatchResult } from './job-match.schema';

const result = (score: number): MatchResult => ({
  score,
  strengths: ['a'],
  gaps: [],
  marketSignals: [],
  priorityGaps: [],
  citations: [],
  suggestions: ['s'],
  requirements: [],
});

describe('MemoryJobMatchStore', () => {
  it('upserts by user+hash and returns the latest match', async () => {
    const store = new MemoryJobMatchStore();
    const older = {
      userId: 'u1',
      contentHash: 'aaa',
      result: result(40),
      jobPreview: 'old',
      jobDescription: 'old jd',
      resume: 'old resume',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const newer = {
      userId: 'u1',
      contentHash: 'bbb',
      result: result(80),
      jobPreview: 'new',
      jobDescription: 'new jd',
      resume: 'new resume',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    };

    await store.upsert(older);
    await store.upsert(newer);

    await expect(store.findLatestByUserId('u1')).resolves.toMatchObject({
      contentHash: 'bbb',
      result: { score: 80 },
    });
    await expect(store.findByUserAndHash('u1', 'aaa')).resolves.toMatchObject({
      result: { score: 40 },
    });
    const history = await store.listByUserId('u1');
    expect(history.map((row) => row.contentHash)).toEqual(['bbb', 'aaa']);
  });

  it('replaces an existing hash instead of duplicating it', async () => {
    const store = new MemoryJobMatchStore();
    await store.upsert({
      userId: 'u1',
      contentHash: 'aaa',
      result: result(10),
      jobPreview: 'first',
      jobDescription: 'jd',
      resume: 'cv',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    await store.upsert({
      userId: 'u1',
      contentHash: 'aaa',
      result: result(99),
      jobPreview: 'updated',
      jobDescription: 'jd2',
      resume: 'cv2',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    const history = await store.listByUserId('u1');
    expect(history).toHaveLength(1);
    expect(history[0].result.score).toBe(99);
  });
});
