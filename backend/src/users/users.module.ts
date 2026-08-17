import { Logger, Module, type Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypedConfigService } from '../config/typed-config.service';
import { MemoryUsersStore } from './memory-users.store';
import { MongoUsersStore } from './mongo-users.store';
import { UserEntity, UserSchema } from './user.schema';
import { UsersService } from './users.service';
import { USERS_STORE } from './users.store';

const usersStoreProvider: Provider = {
  provide: USERS_STORE,
  inject: [TypedConfigService],
  useFactory: (config: TypedConfigService) => {
    const logger = new Logger('UsersModule');
    if (!config.get('MONGODB_URI')) {
      logger.warn('MONGODB_URI unset; using in-memory users store');
      return new MemoryUsersStore();
    }
    logger.log('Using MongoDB users store');
    return undefined;
  },
};

const mongoOn = Boolean(process.env.MONGODB_URI?.trim());

@Module({
  imports: [
    ...(mongoOn
      ? [MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }])]
      : []),
  ],
  providers: [
    UsersService,
    ...(mongoOn
      ? [
          MongoUsersStore,
          { provide: USERS_STORE, useExisting: MongoUsersStore },
        ]
      : [usersStoreProvider]),
  ],
  exports: [UsersService],
})
export class UsersModule {}
