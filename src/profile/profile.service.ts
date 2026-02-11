import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import { EmailService } from '../auth/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import type {
  FamilyInfoDto,
  FamilyInfoResponseDto,
} from './dto/family-response.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdateFamilyBudgetDto } from './dto/update-family-budget.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toProfileResponse(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const shouldSyncFamilyMemberName =
      dto.name != null && dto.name !== user.name && user.familyMemberId;

    const updated = await this.prisma.$transaction(async tx => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(dto.name != null ? { name: dto.name } : {}),
          ...(dto.height != null ? { height: dto.height } : {}),
          ...(dto.weight != null ? { weight: dto.weight } : {}),
          ...(dto.goal != null ? { goal: dto.goal } : {}),
        },
      });

      if (shouldSyncFamilyMemberName) {
        await tx.familyMember.update({
          where: { id: updatedUser.familyMemberId as string },
          data: { name: updatedUser.name },
        });
      }

      return updatedUser;
    });

    return this.toProfileResponse(updated);
  }

  async updateEmail(userId: string, dto: UpdateEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.authProvider !== 'local') {
      throw new ForbiddenException('Cannot change email for OAuth users');
    }

    if (!user.password) {
      throw new BadRequestException('Password required for local auth');
    }

    const ok = await compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid password');
    }

    const newEmail = dto.newEmail.toLowerCase();
    if (newEmail === user.email) {
      return { ok: true };
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (existing && existing.id !== userId) {
      throw new BadRequestException('Email already in use');
    }

    const oldEmail = user.email;

    await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    await Promise.all([
      this.emailService.sendEmailChangedOld(oldEmail, newEmail),
      this.emailService.sendEmailChangedNew(newEmail),
    ]);

    return { ok: true };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.authProvider !== 'local') {
      throw new BadRequestException('Cannot change password for OAuth users');
    }

    if (!user.password) {
      throw new BadRequestException('Password required for local auth');
    }

    const ok = await compare(dto.currentPassword, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid password');
    }

    const passwordHash = await hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    await this.emailService.sendPasswordChanged(user.email);

    return { ok: true };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.confirmation !== 'DELETE_MY_ACCOUNT') {
      throw new BadRequestException('Invalid confirmation');
    }

    if (user.authProvider === 'local') {
      if (!user.password) {
        throw new BadRequestException('Password required for local auth');
      }
      if (!dto.password) {
        throw new BadRequestException('Password required for local auth');
      }

      const ok = await compare(dto.password, user.password);
      if (!ok) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    const email = user.email;

    await this.prisma.$transaction(async tx => {
      if (user.isFamilyHead && user.familyId) {
        const familyId = user.familyId;

        await tx.user.updateMany({
          where: { familyId },
          data: { familyId: null, familyMemberId: null, isFamilyHead: false },
        });

        await tx.supportTicket.deleteMany({
          where: { userId },
        });

        await tx.shoppingListItem.deleteMany({
          where: { shoppingList: { familyId } },
        });
        await tx.shoppingList.deleteMany({ where: { familyId } });

        await tx.menu.deleteMany({ where: { familyId } });

        await tx.inventory.deleteMany({ where: { familyId } });

        await tx.familyMember.deleteMany({ where: { familyId } });

        await tx.family.delete({ where: { id: familyId } });
      } else {
        await tx.supportTicket.deleteMany({ where: { userId } });
        await tx.inventory.deleteMany({ where: { addedById: userId } });

        if (user.familyMemberId) {
          await tx.familyMember.update({
            where: { id: user.familyMemberId },
            data: {
              userId: null,
              isRegistered: false,
              inviteToken: randomUUID(),
            },
          });
        }

        await tx.user.update({
          where: { id: userId },
          data: { familyId: null, familyMemberId: null, isFamilyHead: false },
        });
      }

      await tx.user.delete({ where: { id: userId } });
    });

    await this.emailService.sendAccountDeleted(email);

    return { ok: true };
  }

  async getFamilyInfo(userId: string): Promise<FamilyInfoResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.familyId) {
      return { family: null };
    }

    const family = await this.prisma.family.findUnique({
      where: { id: user.familyId },
      include: { members: true },
    });
    if (!family) {
      return { family: null };
    }

    const familyInfo: FamilyInfoDto = {
      id: family.id,
      weeklyBudget: family.weeklyBudget ? family.weeklyBudget.toNumber() : null,
      budgetUsed: family.budgetUsed.toNumber(),
      budgetPeriodStart: family.budgetPeriodStart,
      budgetPeriodEnd: family.budgetPeriodEnd,
      createdAt: family.createdAt,
      members: family.members.map(m => ({
        id: m.id,
        name: m.name,
        isRegistered: m.isRegistered,
        userId: m.userId,
        mealTimes: Array.isArray(m.mealTimes) ? (m.mealTimes as string[]) : [],
        allergies: Array.isArray(m.allergies) ? (m.allergies as string[]) : [],
        ...(!m.isRegistered ? { inviteToken: m.inviteToken } : {}),
      })),
    };

    return { family: familyInfo };
  }

  async updateFamilyBudget(userId: string, dto: UpdateFamilyBudgetDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true, isFamilyHead: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.familyId) {
      throw new BadRequestException('User has no family');
    }
    if (!user.isFamilyHead) {
      throw new ForbiddenException('Only family head can update budget');
    }

    await this.prisma.family.update({
      where: { id: user.familyId },
      data: {
        weeklyBudget: new Prisma.Decimal(dto.weeklyBudget),
      },
    });

    const updated = await this.getFamilyInfo(userId);
    if (!updated.family) {
      throw new NotFoundException('Family not found');
    }
    return updated;
  }

  private toProfileResponse(user: {
    id: string;
    email: string;
    name: string;
    height: number | null;
    weight: number | null;
    goal: string | null;
    isFamilyHead: boolean;
    familyId: string | null;
    familyMemberId: string | null;
    subscriptionTier: string;
    subscriptionExpiresAt: Date | null;
    trialEndsAt: Date | null;
    authProvider: string;
    createdAt: Date;
    updatedAt: Date;
  }): ProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      height: user.height,
      weight: user.weight,
      goal: user.goal as ProfileResponseDto['goal'],
      isFamilyHead: user.isFamilyHead,
      familyId: user.familyId,
      familyMemberId: user.familyMemberId,
      subscriptionTier:
        user.subscriptionTier as ProfileResponseDto['subscriptionTier'],
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      trialEndsAt: user.trialEndsAt,
      authProvider: user.authProvider as ProfileResponseDto['authProvider'],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
