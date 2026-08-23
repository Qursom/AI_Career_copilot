import {
  InsufficientCoinsError,
  type UserProfileInput,
  type UserRecord,
  type UsersStore,
} from './users.store';

export class MemoryUsersStore implements UsersStore {
  private readonly byUid = new Map<string, UserRecord>();

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

  findByUid(firebaseUid: string): Promise<UserRecord | null> {
    const row = this.byUid.get(firebaseUid);
    return Promise.resolve(row ? { ...row } : null);
  }

  findOrCreate(
    input: UserProfileInput,
    startingCoins: number,
  ): Promise<UserRecord> {
    const existing = this.byUid.get(input.firebaseUid);
    if (existing) {
      // Identity is firebaseUid only. Never join or merge users by email.
      return Promise.resolve({ ...existing });
    }
    const created: UserRecord = {
      id: input.firebaseUid,
      firebaseUid: input.firebaseUid,
      name: input.name?.trim() || 'User',
      email: input.email.toLowerCase(),
      photoUrl: input.photoUrl ?? '',
      interviewCoins: startingCoins,
    };
    this.byUid.set(input.firebaseUid, created);
    return Promise.resolve({ ...created });
  }

  chargeCoins(firebaseUid: string, cost: number): Promise<UserRecord> {
    const row = this.byUid.get(firebaseUid);
    if (!row) {
      return Promise.reject(new Error(`Unknown user ${firebaseUid}`));
    }
    if (row.interviewCoins < cost) {
      return Promise.reject(
        new InsufficientCoinsError(row.interviewCoins, cost),
      );
    }
    row.interviewCoins -= cost;
    return Promise.resolve({ ...row });
  }

  refundCoins(firebaseUid: string, amount: number): Promise<UserRecord> {
    const row = this.byUid.get(firebaseUid);
    if (!row) {
      return Promise.reject(new Error(`Unknown user ${firebaseUid}`));
    }
    row.interviewCoins += amount;
    return Promise.resolve({ ...row });
  }

  creditCoins(firebaseUid: string, amount: number): Promise<UserRecord> {
    return this.refundCoins(firebaseUid, amount);
  }
}
