import { ApiProperty } from '@nestjs/swagger';

export class ExtractedResumeTextDto {
  @ApiProperty({
    description: 'Plain text extracted from the uploaded PDF.',
    minLength: 50,
    maxLength: 20_000,
  })
  text!: string;
}
