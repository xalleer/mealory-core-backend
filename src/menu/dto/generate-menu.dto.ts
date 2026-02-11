import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateMenuDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  familyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regenerationReason?: string;
}
