import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BadRequestException } from '@nestjs/common';
import { normalizeResumeText } from '../ai/langgraph/resume/nodes/normalize-text.node';
import { PdfExtractService } from './pdf-extract.service';

/** Two-page text PDF; see test/fixtures. */
const SAMPLE_PDF = join(__dirname, '../../test/fixtures/sample-resume.pdf');

describe('PdfExtractService', () => {
  it('extracts text from a real multi-page PDF', async () => {
    const service = new PdfExtractService();
    const text = await service.extractFromPath(SAMPLE_PDF);

    expect(text).toContain('Priya Raman');
    expect(text).toContain('Airflow');
    expect(text).toContain('Snowflake');
    // Page 2 content proves every page is read, not just the first.
    expect(text).toContain('BTech Computer Science');
  });

  it('leaves page markers for normalization to strip', async () => {
    const service = new PdfExtractService();
    const text = await service.extractFromPath(SAMPLE_PDF);

    expect(text).toMatch(/--\s*1 of 2\s*--/);
    expect(normalizeResumeText(text)).not.toMatch(/1 of 2/);
  });

  it('does not delete the file it read', async () => {
    const service = new PdfExtractService();
    await service.extractFromPath(SAMPLE_PDF);
    await expect(fs.access(SAMPLE_PDF)).resolves.toBeUndefined();
  });

  it('extractText does not delete the temp file (caller owns cleanup)', async () => {
    const service = new PdfExtractService();
    const path = join(tmpdir(), `resume-test-${Date.now()}.pdf`);
    await fs.writeFile(path, 'not a pdf');
    await expect(
      service.extractText({
        path,
        buffer: Buffer.from('not a pdf'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(fs.access(path)).resolves.toBeUndefined();
    await fs.unlink(path);
  });

  it('extractFromPath rejects invalid PDF with controlled error', async () => {
    const service = new PdfExtractService();
    const path = join(tmpdir(), `resume-bad-${Date.now()}.pdf`);
    await fs.writeFile(path, 'not a pdf');
    await expect(service.extractFromPath(path)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await fs.unlink(path);
  });

  it('unlink removes a temp file asynchronously', async () => {
    const service = new PdfExtractService();
    const path = join(tmpdir(), `resume-unlink-${Date.now()}.pdf`);
    await fs.writeFile(path, '%PDF-1.4');
    await service.unlink(path);
    await expect(fs.access(path)).rejects.toBeDefined();
  });
});
