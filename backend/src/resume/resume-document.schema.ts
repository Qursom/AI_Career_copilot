import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ResumeAnalysis } from '../resume/resume.schema';

@Schema({ timestamps: true, collection: 'resumes' })
export class ResumeEntity {
  @Prop({ required: true, unique: true, index: true })
  userId!: string;

  @Prop({ type: Object, required: true })
  analysis!: ResumeAnalysis;
}

export type ResumeDocument = HydratedDocument<ResumeEntity>;
export const ResumeEntitySchema = SchemaFactory.createForClass(ResumeEntity);
