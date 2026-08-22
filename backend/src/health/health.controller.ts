import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  HealthService,
  type HealthReport,
  type ReadinessReport,
} from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Root — liveness probe.' })
  root(): { message: string } {
    return { message: 'Smart careerCopilot API' };
  }

  @Get('health')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Liveness',
    description:
      'Process is up. Does not check Mongo or Redis — use /health/ready for that.',
  })
  check(): HealthReport {
    return this.service.check();
  }

  @Get('health/ready')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness',
    description:
      '503 when a configured Mongo or Redis dependency is unreachable.',
  })
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadinessReport> {
    const report = await this.service.ready();
    if (report.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
