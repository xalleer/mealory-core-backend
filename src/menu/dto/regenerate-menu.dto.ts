import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RegenerateMenuDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}
