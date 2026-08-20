import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResumeUploadDto {
  @ApiPropertyOptional({
    description: 'Optional target role to tailor the analysis.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  role?: string;
}
