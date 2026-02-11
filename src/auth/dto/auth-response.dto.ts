import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  height?: number | null;

  @ApiProperty({ required: false })
  weight?: number | null;

  @ApiProperty({ required: false, enum: ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE'] })
  goal?: 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | null;

  @ApiProperty()
  isFamilyHead!: boolean;

  @ApiProperty({ required: false })
  familyId?: string | null;

  @ApiProperty({ required: false })
  familyMemberId?: string | null;

  @ApiProperty({ enum: ['EMAIL', 'GOOGLE', 'APPLE'] })
  authProvider!: 'EMAIL' | 'GOOGLE' | 'APPLE';

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  expiresIn!: number;
}

export class SuccessResponseDto {
  @ApiProperty()
  ok!: boolean;
}

export class JoinFamilyResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty()
  ok!: boolean;
}
