import { jobMatchContentHash, jobPreview } from './content-hash';

describe('jobMatchContentHash', () => {
  it('is stable for the same JD+resume regardless of surrounding whitespace', () => {
    const a = jobMatchContentHash('  Engineer  ', '  Jane  ');
    const b = jobMatchContentHash('Engineer', 'Jane');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('changes when either side changes', () => {
    const base = jobMatchContentHash('Engineer', 'Jane');
    expect(jobMatchContentHash('Engineer', 'John')).not.toBe(base);
    expect(jobMatchContentHash('Designer', 'Jane')).not.toBe(base);
  });
});

describe('jobPreview', () => {
  it('collapses whitespace and truncates long descriptions', () => {
    expect(jobPreview('  Senior   Engineer  ')).toBe('Senior Engineer');
    const long = 'x'.repeat(200);
    const preview = jobPreview(long, 20);
    expect(preview.length).toBe(20);
    expect(preview.endsWith('…')).toBe(true);
  });
});
