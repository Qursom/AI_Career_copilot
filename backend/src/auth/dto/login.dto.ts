import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Firebase ID token from signInWithPopup.' })
  @IsString()
  @MinLength(10)
  idToken!: string;
}
