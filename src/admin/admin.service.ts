import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/email.service';
import type {
  CreateSupportTicketDto,
  SupportTicketPriorityType,
  SupportTicketStatusType,
} from './dto/support-ticket.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type Pagination = {
  page?: number;
  limit?: number;
};

type SupportTicketsFilters = Pagination & {
  status?: SupportTicketStatusType;
  priority?: SupportTicketPriorityType;
};

type UsersAnalyticsFilters = Pagination & {
  period?: string;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private getAllCount(row: { _count?: unknown }) {
    const count = (row as { _count?: { _all?: unknown } })._count;
    if (typeof count === 'object' && count !== null) {
      const all = (count as { _all?: unknown })._all;
      if (typeof all === 'number') {
        return all;
      }
    }
    return 0;
  }

  async getAnalyticsOverview() {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      usersTotal,
      usersActive,
      usersNewThisWeek,
      usersWithFamilies,
      familiesTotal,
      familiesActive,
      menusGeneratedLast30Days,
      productsTotal,
      productsActive,
      subscriptionCounts,
      productsByCategory,
      familyUserCounts,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { updatedAt: { gte: last30Days } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      this.prisma.user.count({ where: { familyId: { not: null } } }),
      this.prisma.family.count(),
      this.prisma.family.count({
        where: { menus: { some: { createdAt: { gte: last30Days } } } },
      }),
      this.prisma.menu.count({ where: { createdAt: { gte: last30Days } } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({
        by: ['subscriptionTier'],
        _count: { _all: true },
        orderBy: { subscriptionTier: 'asc' },
      }),
      this.prisma.product.groupBy({
        by: ['category'],
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
      this.prisma.user.groupBy({
        by: ['familyId'],
        where: { familyId: { not: null } },
        _count: { _all: true },
        orderBy: { familyId: 'asc' },
      }),
    ]);

    const subscriptions = {
      free: 0,
      pro: 0,
      familyPro: 0,
    };

    for (const row of subscriptionCounts) {
      const count = this.getAllCount(row);
      if (row.subscriptionTier === 'free') {
        subscriptions.free = count;
      }
      if (row.subscriptionTier === 'pro') {
        subscriptions.pro = count;
      }
      if (row.subscriptionTier === 'family_pro') {
        subscriptions.familyPro = count;
      }
    }

    const byCategory: Record<string, number> = {};
    for (const row of productsByCategory) {
      byCategory[row.category] = this.getAllCount(row);
    }

    const avgSize = familyUserCounts.length
      ? familyUserCounts.reduce((sum, row) => sum + this.getAllCount(row), 0) /
        familyUserCounts.length
      : 0;

    const avgPerFamily =
      familiesTotal > 0 ? menusGeneratedLast30Days / familiesTotal : 0;

    return {
      users: {
        total: usersTotal,
        active: usersActive,
        newThisWeek: usersNewThisWeek,
        withFamilies: usersWithFamilies,
      },
      families: {
        total: familiesTotal,
        active: familiesActive,
        avgSize,
      },
      subscriptions,
      menus: {
        generatedLast30Days: menusGeneratedLast30Days,
        avgPerFamily,
      },
      products: {
        total: productsTotal,
        active: productsActive,
        byCategory,
      },
    };
  }

  async getUserAnalytics(filters: UsersAnalyticsFilters = {}) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be positive numbers');
    }

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (filters.period) {
      const match = String(filters.period).match(/^([0-9]+)d$/);
      if (!match) {
        throw new BadRequestException('Invalid period format. Use e.g. 7d');
      }

      const days = Number(match[1]);
      if (!Number.isFinite(days) || days < 1 || days > 3650) {
        throw new BadRequestException('Invalid period value');
      }

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: since };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionTier: true,
          familyId: true,
          isFamilyHead: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async createSupportTicket(userId: string, dto: CreateSupportTicketDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: dto.subject,
        message: dto.message,
        priority: dto.priority ?? 'normal',
        status: 'pending',
      },
    });

    const supportEmail = process.env.SUPPORT_EMAIL ?? process.env.SMTP_FROM;
    if (supportEmail) {
      try {
        await this.emailService.sendSupportTicketNotification({
          to: supportEmail,
          userEmail: user.email,
          userName: user.name,
          ticketId: ticket.id,
          subject: ticket.subject,
          priority: ticket.priority,
          message: ticket.message,
        });
      } catch {
        void 0;
      }
    }

    return ticket;
  }

  async getSupportTickets(filters: SupportTicketsFilters = {}) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be positive numbers');
    }

    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async updateTicketStatus(id: string, status: SupportTicketStatusType) {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Support ticket not found');
    }

    const resolvedAt =
      status === 'resolved' || status === 'closed' ? new Date() : null;

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status,
        resolvedAt,
      },
    });
  }

  async getSupportTicketById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return ticket;
  }

  async getSystemHealth() {
    let database = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    let openai = false;

    if (openaiApiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        openai = response.ok;
      } catch {
        openai = false;
      }
    }

    const memory = process.memoryUsage();

    return {
      database,
      openai,
      uptime: process.uptime(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      version: process.env.npm_package_version ?? '0.0.0',
    };
  }
}
