import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfExtractService {
  private readonly logger = new Logger(PdfExtractService.name);

  async extractText(file: Express.Multer.File): Promise<string> {
    const path = file.path;
    try {
      const buffer = file.buffer?.length
        ? file.buffer
        : await fs.readFile(path);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const parsed = await parser.getText();
      const text = (parsed.text ?? '').trim();
      if (text.length < 50) {
        throw new BadRequestException({
          message:
            'Could not extract enough text from this PDF. Try a text-based PDF or paste the resume.',
          error: 'PDF_EMPTY',
        });
      }
      return text.slice(0, 20_000);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(
        `pdf-parse failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException({
        message: 'Failed to parse PDF.',
        error: 'PDF_PARSE_FAILED',
      });
    } finally {
      await this.unlink(path);
    }
  }

  async unlink(path?: string): Promise<void> {
    if (!path) return;
    try {
      await fs.unlink(path);
    } catch {
      this.logger.debug(`Could not delete temp upload ${path}`);
    }
  }
}
