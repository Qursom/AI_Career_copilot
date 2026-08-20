import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { TypedConfigService } from '../config/typed-config.service';

const PDF_MAGIC = Buffer.from('%PDF');

@Injectable()
export class ResumeFileService {
  constructor(private readonly config: TypedConfigService) {}

  maxBytes(): number {
    return this.config.get('RESUME_MAX_FILE_SIZE_MB') * 1024 * 1024;
  }

  /**
   * Validate uploaded PDF: size, declared type/extension, and magic bytes.
   * Do not trust browser MIME alone.
   */
  async assertValidPdf(file: Express.Multer.File | undefined): Promise<void> {
    if (!file?.path) {
      throw new BadRequestException({
        message: 'A PDF file is required in the "resume" field.',
        error: 'INVALID_FILE_TYPE',
      });
    }

    const max = this.maxBytes();
    if (file.size > max) {
      throw new PayloadTooLargeException({
        message: `File exceeds the ${this.config.get('RESUME_MAX_FILE_SIZE_MB')} MB limit.`,
        error: 'FILE_TOO_LARGE',
      });
    }

    const mimeOk = file.mimetype === 'application/pdf';
    const extOk = file.originalname.toLowerCase().endsWith('.pdf');
    if (!mimeOk && !extOk) {
      throw new BadRequestException({
        message: 'Only PDF files are accepted.',
        error: 'INVALID_FILE_TYPE',
      });
    }

    const header = Buffer.alloc(4);
    const handle = await fs.open(file.path, 'r');
    try {
      await handle.read(header, 0, 4, 0);
    } finally {
      await handle.close();
    }

    if (!header.equals(PDF_MAGIC)) {
      throw new BadRequestException({
        message: 'Only PDF files are accepted.',
        error: 'INVALID_FILE_TYPE',
      });
    }
  }
}
