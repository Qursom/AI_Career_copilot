import { BadRequestException } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import type { Job } from 'bullmq';
import {
  ResumeAnalysisProcessor,
  jobErrorFromUnknown,
} from './resume-analysis.processor';
import type { ResumeJobData } from './resume-job.types';
import type { ResumeAnalysisService } from '../resume/resume-analysis.service';

describe('ResumeAnalysisProcessor', () => {
  const data: ResumeJobData = {
    userId: 'u1',
    requestId: 'req-1',
    rawText: 'x'.repeat(80),
  };

  it('runs execute and updates progress', async () => {
    const result = { atsScore: 71, interviewCoins: 90 };
    const analysis = {
      execute: jest.fn().mockResolvedValue(result),
    } as unknown as ResumeAnalysisService;
    const processor = new ResumeAnalysisProcessor(analysis);
    const job = {
      id: 'u1:req-1',
      data,
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<ResumeJobData>;

    await expect(processor.process(job)).resolves.toEqual(result);
    expect(analysis.execute).toHaveBeenCalledWith(data);
    expect(job.updateProgress).toHaveBeenCalledWith({
      step: 'running',
      percent: 10,
    });
    expect(job.updateProgress).toHaveBeenCalledWith({
      step: 'completed',
      percent: 100,
    });
  });

  it('does not retry user-facing HTTP errors', async () => {
    const analysis = {
      execute: jest.fn().mockRejectedValue(
        new BadRequestException({
          message: 'Could not extract enough text',
          error: 'EMPTY_RESUME',
        }),
      ),
    } as unknown as ResumeAnalysisService;
    const processor = new ResumeAnalysisProcessor(analysis);
    const job = {
      id: 'u1:req-1',
      data,
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<ResumeJobData>;

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });
});

describe('jobErrorFromUnknown', () => {
  it('keeps Nest error codes from HttpException', () => {
    expect(
      jobErrorFromUnknown(
        new BadRequestException({
          message: 'too short',
          error: 'EMPTY_RESUME',
        }),
      ),
    ).toEqual({ code: 'EMPTY_RESUME', message: 'too short' });
  });
});
