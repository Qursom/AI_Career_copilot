import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { PdfExtractService } from './pdf-extract.service';

describe('PdfExtractService', () => {
  it('unlinks a temp file even when parse fails', async () => {
    const service = new PdfExtractService();
    const path = join(tmpdir(), `resume-test-${Date.now()}.pdf`);
    await fs.writeFile(path, 'not a pdf');
    await expect(
      service.extractText({ path, buffer: Buffer.from('not a pdf') } as Express.Multer.File),
    ).rejects.toBeDefined();
    await expect(fs.access(path)).rejects.toBeDefined();
  });
});
