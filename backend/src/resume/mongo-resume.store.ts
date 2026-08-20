import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResumeEntity, type ResumeDocument } from './resume-document.schema';
import type { ResumeAnalysis } from './resume.schema';
import type { ResumeStore } from './resume.store';

@Injectable()
export class MongoResumeStore implements ResumeStore {
  constructor(
    @InjectModel(ResumeEntity.name)
    private readonly model: Model<ResumeDocument>,
  ) {}

  async upsert(
    userId: string,
    analysis: ResumeAnalysis,
  ): Promise<ResumeAnalysis> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $set: { analysis } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return doc.analysis;
  }

  async findByUserId(userId: string): Promise<ResumeAnalysis | null> {
    const doc = await this.model.findOne({ userId });
    return doc?.analysis ?? null;
  }
}
