import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'users' })
export class UserEntity {
  @Prop({ required: true, unique: true, index: true })
  firebaseUid!: string;

  @Prop({ required: true, default: 'User' })
  name!: string;

  @Prop({ required: true, lowercase: true })
  email!: string;

  @Prop({ required: false, default: '' })
  photoUrl!: string;

  @Prop({ required: true, default: 150 })
  interviewCoins!: number;
}

export type UserDocument = HydratedDocument<UserEntity>;
export const UserSchema = SchemaFactory.createForClass(UserEntity);
