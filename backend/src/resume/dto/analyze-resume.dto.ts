import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

export class AnalyzeResumeDto {
  @ApiProperty({
    description: 'Raw resume text (plain text, markdown, or bullet list).',
    minLength: 50,
    maxLength: 20_000,
    example: 'Jane Doe — Senior Frontend Engineer\n\nExperience…',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(50, 20_000, {
    message: 'resume must be between 50 and 20,000 characters.',
  })
  resume!: string;

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
