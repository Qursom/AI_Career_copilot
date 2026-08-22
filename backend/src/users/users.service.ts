import { Inject, Injectable } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import {
  USERS_STORE,
  InsufficientCoinsError,
  type UserProfileInput,
  type UserRecord,
  type UsersStore,
} from './users.store';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_STORE) private readonly store: UsersStore,
    private readonly config: TypedConfigService,
  ) {}

  ensureUser(firebaseUid: string, email?: string): Promise<UserRecord> {
    return this.store.findOrCreate(
      {
        firebaseUid,
        email: email || `${firebaseUid}@users.local`,
      },
      this.config.get('USER_STARTING_COINS'),
    );
  }

  /** Sign-up creates the Mongo user at USER_STARTING_COINS; sign-in only loads it. */
  findOrCreate(input: UserProfileInput): Promise<UserRecord> {
    return this.store.findOrCreate(
      input,
      this.config.get('USER_STARTING_COINS'),
    );
  }

  getMe(firebaseUid: string): Promise<UserRecord | null> {
    return this.store.findByUid(firebaseUid);
  }

  chargeResumeAnalysis(firebaseUid: string): Promise<UserRecord> {
    return this.store.chargeCoins(
      firebaseUid,
      this.config.get('RESUME_COIN_COST'),
    );
  }

  /** Gives the coins back when a charged analysis could not be delivered. */
  refundResumeAnalysis(firebaseUid: string): Promise<UserRecord> {
    return this.store.refundCoins(
      firebaseUid,
      this.config.get('RESUME_COIN_COST'),
    );
  }

  chargeJobMatch(firebaseUid: string): Promise<UserRecord> {
    return this.store.chargeCoins(
      firebaseUid,
      this.config.get('JOB_MATCH_COIN_COST'),
    );
  }

  refundJobMatch(firebaseUid: string): Promise<UserRecord> {
    return this.store.refundCoins(
      firebaseUid,
      this.config.get('JOB_MATCH_COIN_COST'),
    );
  }

  creditCoins(firebaseUid: string, amount: number): Promise<UserRecord> {
    return this.store.creditCoins(firebaseUid, amount);
  }

  /**
   * Soft balance check before expensive work (charge still happens after
   * success). Defaults to the resume analysis cost when `cost` is omitted.
   */
  async assertSufficientCoins(
    firebaseUid: string,
    cost = this.config.get('RESUME_COIN_COST'),
  ): Promise<UserRecord> {
    const user = await this.store.findByUid(firebaseUid);
    const balance = user?.interviewCoins ?? 0;
    if (!user || balance < cost) {
      throw new InsufficientCoinsError(balance, cost);
    }
    return user;
  }

  resumeCoinCost(): number {
    return this.config.get('RESUME_COIN_COST');
  }

  jobMatchCoinCost(): number {
    return this.config.get('JOB_MATCH_COIN_COST');
  }
}
