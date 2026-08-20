import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { resumeJobId } from './queue.constants';
import { ResumeJobClient, parseFailedReason } from './resume-job.client';
import type { ResumeJobData } from './resume-job.types';

describe('resumeJobId', () => {
  it('avoids colons because BullMQ rejects them in custom ids', () => {
    expect(resumeJobId('u1', 'req-1')).toBe('u1__req-1');
    expect(resumeJobId('u1', 'req-1')).not.toContain(':');
  });
});

function mockQueue(overrides: Partial<Queue> = {}): Queue {
  return {
    getJob: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue({ id: 'u1__req-1' }),
    ...overrides,
  } as unknown as Queue;
}

describe('ResumeJobClient', () => {
  const data: ResumeJobData = {
    userId: 'u1',
    requestId: 'req-1',
    rawText: 'Jane Doe is a software engineer with five years of TypeScript.',
  };

  it('enqueues a new job and returns queued', async () => {
    const queue = mockQueue();
    const client = new ResumeJobClient(queue);
    await expect(client.enqueue(data)).resolves.toEqual({
      jobId: 'u1__req-1',
      status: 'queued',
    });
    expect(queue.add).toHaveBeenCalledWith(
      'analyze',
      data,
      expect.objectContaining({ jobId: 'u1__req-1', attempts: 1 }),
    );
  });

  it('returns the existing job when the worker has not started', async () => {
    const existing = {
      getState: jest.fn().mockResolvedValue('waiting'),
    };
    const queue = mockQueue({
      getJob: jest.fn().mockResolvedValue(existing),
    });
    const client = new ResumeJobClient(queue);
    await expect(client.enqueue(data)).resolves.toEqual({
      jobId: 'u1__req-1',
      status: 'queued',
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('maps a Redis timeout on enqueue to QUEUE_UNAVAILABLE', async () => {
    const queue = mockQueue({
      getJob: jest.fn().mockImplementation(
        () => new Promise(() => undefined),
      ),
    });
    const client = new ResumeJobClient(queue);
    await expect(client.enqueue(data)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns completed result from getStatus', async () => {
    const job = {
      data: { userId: 'u1' },
      progress: { step: 'completed', percent: 100 },
      returnvalue: { atsScore: 70, interviewCoins: 90 },
      getState: jest.fn().mockResolvedValue('completed'),
    };
    const queue = mockQueue({
      getJob: jest.fn().mockResolvedValue(job),
    });
    const client = new ResumeJobClient(queue);
    const status = await client.getStatus('u1__req-1', 'u1');
    expect(status.status).toBe('completed');
    expect(status.result?.atsScore).toBe(70);
  });

  it('hides another user\'s job as NOT_FOUND', async () => {
    const job = {
      data: { userId: 'other' },
      getState: jest.fn(),
    };
    const queue = mockQueue({
      getJob: jest.fn().mockResolvedValue(job),
    });
    const client = new ResumeJobClient(queue);
    await expect(client.getStatus('u1__req-1', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('parses JSON failedReason from the worker', () => {
    expect(
      parseFailedReason(
        JSON.stringify({ code: 'EMPTY_RESUME', message: 'too short' }),
      ),
    ).toEqual({ code: 'EMPTY_RESUME', message: 'too short' });
  });
});

describe('ResumeJobClient failed job retry', () => {
  it('removes a failed job so the same idempotency key can re-enqueue', async () => {
    const existing = {
      getState: jest.fn().mockResolvedValue('failed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const queue = mockQueue({
      getJob: jest.fn().mockResolvedValue(existing),
    });
    const client = new ResumeJobClient(queue);
    await client.enqueue({
      userId: 'u1',
      requestId: 'req-1',
    });
    expect(existing.remove).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalled();
  });
});
