import { ApiProperty } from '@nestjs/swagger';

export class FamilyMemberInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isRegistered!: boolean;

  @ApiProperty({ required: false, nullable: true })
  userId!: string | null;

  @ApiProperty({ type: [String] })
  mealTimes!: string[];

  @ApiProperty({ type: [String] })
  allergies!: string[];

  @ApiProperty({ required: false })
  inviteToken?: string;
}

export class FamilyInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  weeklyBudget!: number | null;

  @ApiProperty()
  budgetUsed!: number;

  @ApiProperty({ required: false, nullable: true })
  budgetPeriodStart!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  budgetPeriodEnd!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [FamilyMemberInfoDto] })
  members!: FamilyMemberInfoDto[];
}

export class FamilyInfoResponseDto {
  @ApiProperty({ required: false, nullable: true, type: FamilyInfoDto })
  family!: FamilyInfoDto | null;
}
