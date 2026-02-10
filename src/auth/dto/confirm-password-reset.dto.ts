import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class ConfirmPasswordResetDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '6 digits code' })
  @IsString()
  @Matches(/^\d{6}$/)
  otpCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
