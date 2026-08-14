import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EvaluateResumeDto {
  @IsString() @MinLength(50) @MaxLength(20000)
  resume!: string;

  @IsString() @MinLength(50) @MaxLength(20000)
  jobDescription!: string;

  @IsOptional() @IsString() @MaxLength(10000)
  coverLetter?: string;

  @IsOptional() @IsString() @MaxLength(120)
  targetRole?: string;
}
