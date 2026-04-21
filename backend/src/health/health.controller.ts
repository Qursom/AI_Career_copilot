import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService, type HealthReport } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Root — liveness probe.' })
  root(): { message: string } {
    return { message: 'AI Career Copilot API' };
  }

  @Get('health')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns process uptime, env, and active LLM provider.',
  })
  check(): HealthReport {
    return this.service.check();
  }
}
