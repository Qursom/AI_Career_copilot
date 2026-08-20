import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

export class AnalyzeResumeDto {
  @ApiPropertyOptional({
    description:
      'Raw resume text (plain text, markdown, or bullet list). Required unless a PDF is uploaded.',
    minLength: 50,
    maxLength: 20_000,
    example: 'Jane Doe — Senior Frontend Engineer\n\nExperience…',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(0, 20_000, {
    message: 'resume must be at most 20,000 characters.',
  })
  resume?: string;

  @ApiPropertyOptional({
    description: 'Target role to optimize the resume for.',
    maxLength: 120,
    example: 'Senior Frontend Engineer',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(0, 120)
  role?: string;
}
