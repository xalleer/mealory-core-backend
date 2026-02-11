import { ApiProperty } from '@nestjs/swagger';
import type { AuthProviderType, GoalType } from '../../auth/auth.types';

export type SubscriptionTierType = 'free' | 'pro' | 'family_pro';

export class ProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  height!: number | null;

  @ApiProperty({ required: false, nullable: true })
  weight!: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    enum: ['weight_loss', 'weight_gain', 'healthy_eating', 'maintain_weight'],
  })
  goal!: GoalType | null;

  @ApiProperty()
  isFamilyHead!: boolean;

  @ApiProperty({ required: false, nullable: true })
  familyId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  familyMemberId!: string | null;

  @ApiProperty({ enum: ['free', 'pro', 'family_pro'] })
  subscriptionTier!: SubscriptionTierType;

  @ApiProperty({ required: false, nullable: true })
  subscriptionExpiresAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  trialEndsAt!: Date | null;

  @ApiProperty({ enum: ['local', 'google', 'apple'] })
  authProvider!: AuthProviderType;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
