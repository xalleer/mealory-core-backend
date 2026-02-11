import { ApiProperty } from '@nestjs/swagger';
import { InventoryResponseDto } from './inventory-response.dto';

export class InventoryListResponseDto {
  @ApiProperty({ type: [InventoryResponseDto] })
  items!: InventoryResponseDto[];

  @ApiProperty()
  total!: number;
}
