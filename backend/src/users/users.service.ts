import { Inject, Injectable } from '@nestjs/common';
import { TypedConfigService } from '../config/typed-config.service';
import {
  USERS_STORE,
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
}
