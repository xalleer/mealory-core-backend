import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  SUPPORT_TICKET_STATUS_VALUES,
  type SupportTicketStatusType,
} from './support-ticket.dto';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: SUPPORT_TICKET_STATUS_VALUES })
  @IsIn(SUPPORT_TICKET_STATUS_VALUES)
  status!: SupportTicketStatusType;
}
