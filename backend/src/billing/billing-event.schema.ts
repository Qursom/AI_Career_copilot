import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'billing_events' })
export class BillingEventEntity {
  @Prop({ required: true, unique: true, index: true })
  stripeEventId!: string;

  @Prop({ required: true, unique: true, index: true })
  stripeSessionId!: string;

  @Prop({ required: true, index: true })
  firebaseUid!: string;

  @Prop({ required: true })
  coins!: number;

  @Prop({ required: true })
  packId!: string;
}

export type BillingEventDocument = HydratedDocument<BillingEventEntity>;
export const BillingEventSchema =
  SchemaFactory.createForClass(BillingEventEntity);
