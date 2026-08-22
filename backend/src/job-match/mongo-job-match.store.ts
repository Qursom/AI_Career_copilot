import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  JobMatchEntity,
  type JobMatchDocument,
} from './job-match-document.schema';
import type { JobMatchStore, JobMatchStored } from './job-match.store';

@Injectable()
export class MongoJobMatchStore implements JobMatchStore {
  constructor(
    @InjectModel(JobMatchEntity.name)
    private readonly model: Model<JobMatchDocument>,
  ) {}

  async upsert(record: JobMatchStored): Promise<JobMatchStored> {
    const doc = await this.model.findOneAndUpdate(
      { userId: record.userId, contentHash: record.contentHash },
      {
        $set: {
          result: record.result,
          jobPreview: record.jobPreview,
          jobDescription: record.jobDescription,
          resume: record.resume,
        },
        $setOnInsert: {
          userId: record.userId,
          contentHash: record.contentHash,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return this.toStored(doc);
  }

  async findByUserAndHash(
    userId: string,
    contentHash: string,
  ): Promise<JobMatchStored | null> {
    const doc = await this.model.findOne({ userId, contentHash });
    return doc ? this.toStored(doc) : null;
  }

  async findLatestByUserId(userId: string): Promise<JobMatchStored | null> {
    const doc = await this.model
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .exec();
    return doc ? this.toStored(doc) : null;
  }

  async listByUserId(userId: string, limit = 20): Promise<JobMatchStored[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => this.toStored(doc as JobMatchDocument));
  }

  private toStored(doc: JobMatchDocument): JobMatchStored {
    return {
      userId: doc.userId,
      contentHash: doc.contentHash,
      result: doc.result,
      jobPreview: doc.jobPreview,
      jobDescription: doc.jobDescription ?? '',
      resume: doc.resume ?? '',
      createdAt: doc.createdAt ?? new Date(),
    };
  }
}
