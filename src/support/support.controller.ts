import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from '../admin/admin.service';
import {
  CreateSupportTicketDto,
  SupportTicketResponseDto,
} from '../admin/dto/support-ticket.dto';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly adminService: AdminService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: SupportTicketResponseDto })
  @Post('tickets')
  async createSupportTicket(
    @Req() req: Request,
    @Body() dto: CreateSupportTicketDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.adminService.createSupportTicket(userId, dto);
  }
}
