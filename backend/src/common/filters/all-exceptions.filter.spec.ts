import { HttpStatus, PayloadTooLargeException } from '@nestjs/common';
import { MulterError } from 'multer';
import { AllExceptionsFilter } from './all-exceptions.filter';
import type { TypedConfigService } from '../../config/typed-config.service';

function host(args?: { type?: string }) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn().mockReturnThis(),
  };
  const req = {
    requestId: 'rid-1',
    originalUrl: '/api/v1/resume/upload',
    method: 'POST',
  };
  return {
    getType: () => args?.type ?? 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    res,
  };
}

describe('AllExceptionsFilter', () => {
  const filterFor = (isProd: boolean) =>
    new AllExceptionsFilter({
      isProd,
      get: (key: string) => (key === 'RESUME_MAX_FILE_SIZE_MB' ? 20 : undefined),
    } as unknown as TypedConfigService);

  it('maps Multer LIMIT_FILE_SIZE to FILE_TOO_LARGE', () => {
    const ctx = host();
    filterFor(false).catch(new MulterError('LIMIT_FILE_SIZE'), ctx as never);

    expect(ctx.res.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(ctx.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds the 20 MB limit.',
        }),
      }),
    );
  });

  it("maps Nest's default PayloadTooLargeException to FILE_TOO_LARGE", () => {
    const ctx = host();
    filterFor(false).catch(new PayloadTooLargeException(), ctx as never);

    expect(ctx.res.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(ctx.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds the 20 MB limit.',
        }),
      }),
    );
  });

  it('keeps a service-provided FILE_TOO_LARGE message', () => {
    const ctx = host();
    filterFor(false).catch(
      new PayloadTooLargeException({
        message: 'File exceeds the 20 MB limit.',
        error: 'FILE_TOO_LARGE',
      }),
      ctx as never,
    );

    expect(ctx.res.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(ctx.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FILE_TOO_LARGE' }),
      }),
    );
  });

  it('redacts unknown 500 messages in production', () => {
    const ctx = host();
    filterFor(true).catch(
      new Error('ECONNREFUSED mongodb://secret@localhost'),
      ctx as never,
    );

    expect(ctx.res.status).toHaveBeenCalledWith(500);
    expect(ctx.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again.',
        }),
      }),
    );
  });

  it('surfaces unknown 500 messages outside production', () => {
    const ctx = host();
    filterFor(false).catch(new Error('mongo down'), ctx as never);

    expect(ctx.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'mongo down',
        }),
      }),
    );
  });
});
