export const USERS_STORE = Symbol('USERS_STORE');

export interface UserProfileInput {
  firebaseUid: string;
  email: string;
  name?: string;
  photoUrl?: string;
}

export interface UserRecord {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  photoUrl: string;
  interviewCoins: number;
}

export interface UsersStore {
  upsert(
    firebaseUid: string,
    email: string,
    startingCoins: number,
    profile?: { name?: string; photoUrl?: string },
  ): Promise<UserRecord>;
  findByUid(firebaseUid: string): Promise<UserRecord | null>;
  findOrCreate(
    input: UserProfileInput,
    startingCoins: number,
  ): Promise<UserRecord>;
  chargeCoins(firebaseUid: string, cost: number): Promise<UserRecord>;
}

export class InsufficientCoinsError extends Error {
  readonly code = 'INSUFFICIENT_COINS' as const;
  constructor(
    public readonly balance: number,
    public readonly cost: number,
  ) {
    super(`Need ${cost} interview coins; balance is ${balance}.`);
  }
}
