import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from '../users/users.module';
import { UsersController } from '../users/users.controller';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { FirebaseAdminService } from './firebase-admin.service';

@Module({
  imports: [CacheModule, UsersModule],
  controllers: [AuthController, UsersController],
  providers: [FirebaseAdminService, AuthService, AuthGuard],
  exports: [FirebaseAdminService, AuthService, AuthGuard],
})
export class AuthModule {}
