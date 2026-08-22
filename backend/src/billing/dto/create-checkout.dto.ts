import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ example: 'starter' })
  @IsString()
  @MinLength(1)
  packId!: string;
}
