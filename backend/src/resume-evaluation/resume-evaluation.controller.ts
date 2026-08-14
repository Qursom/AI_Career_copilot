import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { EvaluateResumeDto } from './dto/evaluate-resume.dto';
import { ResumeEvaluationService } from './resume-evaluation.service';

@ApiTags('resume-evaluation')
@Controller('resume')
export class ResumeEvaluationController {
  constructor(private readonly service: ResumeEvaluationService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a resume against a job description using a LangGraph workflow' })
  evaluate(@Body() dto: EvaluateResumeDto, @Req() req: Request) {
    return this.service.evaluate(dto, req.requestId);
  }
}
