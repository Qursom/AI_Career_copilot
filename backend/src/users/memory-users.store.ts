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
      existing.email = input.email || existing.email;
      if (input.name) existing.name = input.name;
      if (input.photoUrl) existing.photoUrl = input.photoUrl;
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
}
