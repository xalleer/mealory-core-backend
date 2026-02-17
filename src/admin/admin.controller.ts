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
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
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

const USER_ROLE_VALUES = ['user', 'admin', 'super_admin'] as const;
type UserRoleType = (typeof USER_ROLE_VALUES)[number];

const SUBSCRIPTION_TIER_VALUES = ['free', 'pro', 'family_pro'] as const;
type SubscriptionTierType = (typeof SUBSCRIPTION_TIER_VALUES)[number];

const USER_SORT_BY_VALUES = ['createdAt', 'updatedAt', 'email', 'name'] as const;
type UserSortByType = (typeof USER_SORT_BY_VALUES)[number];

const SORT_ORDER_VALUES = ['asc', 'desc'] as const;
type SortOrderType = (typeof SORT_ORDER_VALUES)[number];

const FAMILY_SORT_BY_VALUES = ['createdAt', 'updatedAt'] as const;
type FamilySortByType = (typeof FAMILY_SORT_BY_VALUES)[number];

class UsersAnalyticsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  period?: string;
}

class AdminUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(USER_ROLE_VALUES)
  role?: UserRoleType;

  @IsOptional()
  @IsIn(SUBSCRIPTION_TIER_VALUES)
  subscriptionTier?: SubscriptionTierType;

  @IsOptional()
  @IsIn(USER_SORT_BY_VALUES)
  sortBy?: UserSortByType;

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  sortOrder?: SortOrderType;
}

class AdminFamiliesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(FAMILY_SORT_BY_VALUES)
  sortBy?: FamilySortByType;

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  sortOrder?: SortOrderType;
}

class RecentActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
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
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: USER_ROLE_VALUES })
  @ApiQuery({
    name: 'subscriptionTier',
    required: false,
    enum: SUBSCRIPTION_TIER_VALUES,
  })
  @ApiQuery({ name: 'sortBy', required: false, enum: USER_SORT_BY_VALUES })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SORT_ORDER_VALUES })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('users')
  async getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
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
  @ApiQuery({ name: 'sortBy', required: false, enum: FAMILY_SORT_BY_VALUES })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SORT_ORDER_VALUES })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('families')
  async getFamilies(@Query() query: AdminFamiliesQueryDto) {
    return this.adminService.getFamilies(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        users: { type: 'array', items: { type: 'object' } },
        families: { type: 'array', items: { type: 'object' } },
        menus: { type: 'array', items: { type: 'object' } },
        supportTickets: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('activity/recent')
  async getRecentActivity(@Query() query: RecentActivityQueryDto) {
    return this.adminService.getRecentActivity(query);
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
