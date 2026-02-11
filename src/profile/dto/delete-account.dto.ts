import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiPropertyOptional({ minLength: 6 })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ enum: ['DELETE_MY_ACCOUNT'] })
  @IsString()
  @IsIn(['DELETE_MY_ACCOUNT'])
  confirmation!: 'DELETE_MY_ACCOUNT';
}
