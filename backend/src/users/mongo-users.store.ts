import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity, type UserDocument } from './user.schema';
import {
  InsufficientCoinsError,
  type UserProfileInput,
  type UserRecord,
  type UsersStore,
} from './users.store';

@Injectable()
export class MongoUsersStore implements UsersStore {
  constructor(
    @InjectModel(UserEntity.name) private readonly model: Model<UserDocument>,
  ) {}

  upsert(
    firebaseUid: string,
    email: string,
    startingCoins: number,
    profile?: { name?: string; photoUrl?: string },
  ): Promise<UserRecord> {
    return this.findOrCreate(
      { firebaseUid, email, name: profile?.name, photoUrl: profile?.photoUrl },
      startingCoins,
    );
  }

  async findByUid(firebaseUid: string): Promise<UserRecord | null> {
    const doc = await this.model.findOne({ firebaseUid });
    return doc ? this.toRecord(doc) : null;
  }

  async findOrCreate(
    input: UserProfileInput,
    startingCoins: number,
  ): Promise<UserRecord> {
    const existing = await this.model.findOne({ firebaseUid: input.firebaseUid });
    if (existing) {
      existing.email = input.email.toLowerCase() || existing.email;
      if (input.name) existing.name = input.name;
      if (input.photoUrl) existing.photoUrl = input.photoUrl;
      await existing.save();
      return this.toRecord(existing);
    }

    const created = await this.model.create({
      firebaseUid: input.firebaseUid,
      email: input.email.toLowerCase(),
      name: input.name?.trim() || 'User',
      photoUrl: input.photoUrl ?? '',
      interviewCoins: startingCoins,
    });
    return this.toRecord(created);
  }

  async chargeCoins(firebaseUid: string, cost: number): Promise<UserRecord> {
    const updated = await this.model.findOneAndUpdate(
      { firebaseUid, interviewCoins: { $gte: cost } },
      { $inc: { interviewCoins: -cost } },
      { new: true },
    );
    if (!updated) {
      const existing = await this.findByUid(firebaseUid);
      throw new InsufficientCoinsError(existing?.interviewCoins ?? 0, cost);
    }
    return this.toRecord(updated);
  }

  private toRecord(doc: UserDocument): UserRecord {
    return {
      id: String(doc._id),
      firebaseUid: doc.firebaseUid,
      name: doc.name || 'User',
      email: doc.email,
      photoUrl: doc.photoUrl ?? '',
      interviewCoins: doc.interviewCoins,
    };
  }
}
