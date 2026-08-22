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
  it('collapses whitespace for short titles', () => {
    expect(jobPreview('  Senior   Engineer  ')).toBe('Senior Engineer');
  });

  it('truncates long descriptions on a word boundary', () => {
    const long = 'x'.repeat(200);
    const preview = jobPreview(long, 20);
    expect(preview.length).toBeLessThanOrEqual(20);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('uses a Job title: label instead of company fluff', () => {
    const jd = `
About the job
Acme Corp is a leading platform for global logistics and we have been around for decades.

Job title: Senior Backend Engineer

We are looking for someone who loves APIs.
`;
    expect(jobPreview(jd)).toBe('Senior Backend Engineer');
  });

  it('extracts the role from a looking-for sentence', () => {
    const jd =
      'We are looking for a Node.js Backend Engineer to join our platform team. You will own APIs.';
    expect(jobPreview(jd)).toBe('Node.js Backend Engineer');
  });

  it('recovers a title from a collapsed About-the-job snippet (older history rows)', () => {
    const storedPreview =
      'About the job Acme Corp is a leading platform. We are looking for a Senior Backend Engineer to join our team and own APIs across services.';
    expect(jobPreview(storedPreview)).toBe('Senior Backend Engineer');
  });
});
