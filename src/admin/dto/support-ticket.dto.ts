import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SUPPORT_TICKET_PRIORITY_VALUES = [
  'low',
  'normal',
  'high',
  'urgent',
] as const;

export const SUPPORT_TICKET_STATUS_VALUES = [
  'pending',
  'in_progress',
  'resolved',
  'closed',
] as const;

export type SupportTicketPriorityType =
  (typeof SUPPORT_TICKET_PRIORITY_VALUES)[number];

export type SupportTicketStatusType =
  (typeof SUPPORT_TICKET_STATUS_VALUES)[number];

export class CreateSupportTicketDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ enum: SUPPORT_TICKET_PRIORITY_VALUES })
  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITY_VALUES)
  priority?: SupportTicketPriorityType;
}

export class SupportTicketResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  userId!: string;

  @ApiProperty({ type: String })
  subject!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ enum: SUPPORT_TICKET_STATUS_VALUES })
  status!: SupportTicketStatusType;

  @ApiProperty({ enum: SUPPORT_TICKET_PRIORITY_VALUES })
  priority!: SupportTicketPriorityType;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: Date })
  resolvedAt?: Date | null;
}

export class SupportTicketListResponseDto {
  @ApiProperty({ type: [SupportTicketResponseDto] })
  items!: SupportTicketResponseDto[];

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  limit!: number;
}
