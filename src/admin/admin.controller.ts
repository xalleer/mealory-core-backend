import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { AnalyticsOverviewDto } from './dto/analytics-overview.dto';
import {
  SUPPORT_TICKET_PRIORITY_VALUES,
  SUPPORT_TICKET_STATUS_VALUES,
  SupportTicketListResponseDto,
  SupportTicketResponseDto,
  type SupportTicketPriorityType,
  type SupportTicketStatusType,
} from './dto/support-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

class UsersAnalyticsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  period?: string;
}

class SupportTicketsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SUPPORT_TICKET_STATUS_VALUES)
  status?: SupportTicketStatusType;

  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITY_VALUES)
  priority?: SupportTicketPriorityType;
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOkResponse({ type: AnalyticsOverviewDto })
  @Get('analytics/overview')
  async getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('analytics/users')
  async getUserAnalytics(@Query() query: UsersAnalyticsQueryDto) {
    return this.adminService.getUserAnalytics(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOkResponse({ type: SupportTicketListResponseDto })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SUPPORT_TICKET_STATUS_VALUES,
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: SUPPORT_TICKET_PRIORITY_VALUES,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('support/tickets')
  async getSupportTickets(@Query() query: SupportTicketsQueryDto) {
    return this.adminService.getSupportTickets(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOkResponse({ type: SupportTicketResponseDto })
  @Get('support/tickets/:id')
  async getSupportTicketById(@Param('id') id: string) {
    return this.adminService.getSupportTicketById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOkResponse({ type: SupportTicketResponseDto })
  @Patch('support/tickets/:id/status')
  async updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.adminService.updateTicketStatus(id, dto.status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        database: { type: 'boolean' },
        openai: { type: 'boolean' },
        uptime: { type: 'number' },
        memory: { type: 'object' },
        version: { type: 'string' },
      },
    },
  })
  @Get('system/health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
