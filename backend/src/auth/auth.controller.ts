import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, type AuthUserDto } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser, type AuthUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Tighter than the global throttle — token exchange is a credential endpoint. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a Firebase ID token for an HTTP-only session cookie.',
  })
  @ApiUnauthorizedResponse({ description: 'Firebase ID token was rejected.' })
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUserDto }> {
    return this.auth.loginWithIdToken(dto.idToken, res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Return the current session user from MongoDB.' })
  @ApiUnauthorizedResponse({ description: 'Missing or expired session.' })
  me(
    @Req() req: Request,
    @CurrentUser() user: AuthUser,
  ): Promise<{ user: AuthUserDto }> {
    return this.auth.me(req, user.userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the Redis session and session_id cookie.' })
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    return this.auth.logout(req, res);
  }
}
