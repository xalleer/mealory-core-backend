import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ScanReceiptDto {
  @ApiProperty({ description: 'Base64 encoded image' })
  @IsString()
  receiptImage!: string;
}
