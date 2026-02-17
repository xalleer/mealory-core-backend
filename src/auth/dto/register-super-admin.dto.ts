import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterSuperAdminDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description:
      'One-time secret to allow registering a super admin (compare to SUPER_ADMIN_REGISTRATION_SECRET env var)',
  })
  @IsString()
  @IsNotEmpty()
  secret!: string;
}
