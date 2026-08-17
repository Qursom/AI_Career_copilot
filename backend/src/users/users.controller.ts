import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { TypedConfigService } from '../config/typed-config.service';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly config: TypedConfigService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user profile and resume coin balance.' })
  async me(@CurrentUser() user: AuthUser) {
    const record = await this.users.ensureUser(user.userId, user.email);
    return {
      userId: record.firebaseUid,
      name: record.name,
      email: record.email,
      photoUrl: record.photoUrl,
      interviewCoins: record.interviewCoins,
      resumeCoinCost: this.config.get('RESUME_COIN_COST'),
    };
  }
}
