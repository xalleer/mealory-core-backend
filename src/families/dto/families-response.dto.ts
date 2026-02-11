import { ApiProperty } from '@nestjs/swagger';

export class GenerateInviteResponseDto {
  @ApiProperty()
  inviteToken!: string;

  @ApiProperty()
  familyId!: string;

  @ApiProperty()
  memberId!: string;
}
