import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { MatchResult } from './job-match.schema';

@Schema({ timestamps: true, collection: 'job_matches' })
export class JobMatchEntity {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  contentHash!: string;

  @Prop({ type: Object, required: true })
  result!: MatchResult;

  @Prop({ required: true, default: '' })
  jobPreview!: string;

  @Prop({ required: false, default: '' })
  jobDescription!: string;

  @Prop({ required: false, default: '' })
  resume!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type JobMatchDocument = HydratedDocument<JobMatchEntity>;
export const JobMatchEntitySchema =
  SchemaFactory.createForClass(JobMatchEntity);

JobMatchEntitySchema.index({ userId: 1, contentHash: 1 }, { unique: true });
JobMatchEntitySchema.index({ userId: 1, createdAt: -1 });
