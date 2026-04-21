import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class ScoreMatchDto {
  @ApiProperty({
    description: 'The job description to match against.',
    minLength: 50,
    maxLength: 20_000,
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(50, 20_000, {
    message: 'jobDescription must be between 50 and 20,000 characters.',
  })
  jobDescription!: string;

  @ApiProperty({
    description: 'The applicant resume text.',
    minLength: 50,
    maxLength: 20_000,
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(50, 20_000, {
    message: 'resume must be between 50 and 20,000 characters.',
  })
  resume!: string;
}
