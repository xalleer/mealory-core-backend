import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcrypt';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { EmailService } from './email.service';
import type { AuthProviderType, GoalType, OAuthUser } from './auth.types';

type UserLike = {
  id: string;
  email: string;
  name: string;
  height: number | null;
  weight: number | null;
  goal: GoalType | null;
  isFamilyHead: boolean;
  familyId: string | null;
  familyMemberId: string | null;
  authProvider: AuthProviderType;
  createdAt: Date;
  updatedAt: Date;
};

const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await hash(dto.password, 10);
    if (!passwordHash) {
      throw new Error('Failed to hash password');
    }

    const goal: GoalType | null = dto.goal ?? null;

    const { start: budgetPeriodStart, end: budgetPeriodEnd } =
      this.getCurrentWeekPeriod();

    const normalizedEmail = dto.email.toLowerCase();

    const user = await this.prisma.$transaction(async tx => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: passwordHash,
          name: dto.name,
          height: dto.height ?? null,
          weight: dto.weight ?? null,
          goal,
          authProvider: 'local',
          isFamilyHead: true,
        },
      });

      const family = await tx.family.create({
        data: {
          createdById: createdUser.id,
          weeklyBudget:
            dto.weeklyBudget != null
              ? new Prisma.Decimal(dto.weeklyBudget)
              : null,
          budgetPeriodStart,
          budgetPeriodEnd,
        },
      });

      const selfFamilyMember = await tx.familyMember.create({
        data: {
          familyId: family.id,
          name: createdUser.name,
          userId: createdUser.id,
          isRegistered: true,
          mealTimes: dto.mealTimes,
          allergies: dto.allergies,
        },
      });

      if (dto.familyMembers?.length) {
        await tx.familyMember.createMany({
          data: dto.familyMembers.map(m => ({
            familyId: family.id,
            name: m.name,
            ...(m.mealTimes ? { mealTimes: m.mealTimes } : {}),
            ...(m.allergies ? { allergies: m.allergies } : {}),
          })),
        });
      }

      return await tx.user.update({
        where: { id: createdUser.id },
        data: {
          familyId: family.id,
          familyMemberId: selfFamilyMember.id,
        },
      });
    });

    const accessToken = await this.issueAccessToken(user.id, user.email);

    const needsOnboarding =
      user.height == null ||
      user.weight == null ||
      user.goal == null ||
      user.familyId == null ||
      user.familyMemberId == null;

    return {
      user: this.sanitizeUser(user),
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      needsOnboarding,
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { start: budgetPeriodStart, end: budgetPeriodEnd } =
      this.getCurrentWeekPeriod();

    const updatedUser = await this.prisma.$transaction(async tx => {
      const familyId = user.familyId
        ? user.familyId
        : (
            await tx.family.create({
              data: {
                createdById: user.id,
                weeklyBudget:
                  dto.weeklyBudget != null
                    ? new Prisma.Decimal(dto.weeklyBudget)
                    : null,
                budgetPeriodStart,
                budgetPeriodEnd,
              },
            })
          ).id;

      if (dto.weeklyBudget != null) {
        await tx.family.update({
          where: { id: familyId },
          data: {
            weeklyBudget: new Prisma.Decimal(dto.weeklyBudget),
            budgetPeriodStart,
            budgetPeriodEnd,
          },
        });
      }

      const familyMemberId = user.familyMemberId
        ? user.familyMemberId
        : (
            await tx.familyMember.create({
              data: {
                familyId,
                name: user.name,
                userId: user.id,
                isRegistered: true,
                mealTimes: dto.mealTimes,
                allergies: dto.allergies,
              },
            })
          ).id;

      await tx.familyMember.update({
        where: { id: familyMemberId },
        data: {
          mealTimes: dto.mealTimes,
          allergies: dto.allergies,
        },
      });

      if (dto.familyMembers?.length) {
        await tx.familyMember.createMany({
          data: dto.familyMembers.map(m => ({
            familyId,
            name: m.name,
            ...(m.mealTimes ? { mealTimes: m.mealTimes } : {}),
            ...(m.allergies ? { allergies: m.allergies } : {}),
          })),
        });
      }

      return await tx.user.update({
        where: { id: user.id },
        data: {
          height: dto.height,
          weight: dto.weight,
          goal: dto.goal,
          isFamilyHead: true,
          familyId,
          familyMemberId,
        },
      });
    });

    const accessToken = await this.issueAccessToken(
      updatedUser.id,
      updatedUser.email,
    );

    return {
      user: this.sanitizeUser(updatedUser),
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      needsOnboarding: false,
    };
  }

  async joinFamily(userId: string, inviteToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const member = await this.prisma.familyMember.findUnique({
      where: { inviteToken },
    });
    if (!member) {
      throw new BadRequestException('Invalid invite token');
    }
    if (member.userId) {
      throw new BadRequestException('Invite already used');
    }
    if (user.familyId && user.familyId !== member.familyId) {
      throw new BadRequestException('User already in family');
    }
    if (user.familyMemberId) {
      throw new BadRequestException('User already joined a family');
    }

    const updatedUser = await this.prisma.$transaction(async tx => {
      await tx.familyMember.update({
        where: { id: member.id },
        data: {
          userId: user.id,
          isRegistered: true,
          inviteToken: randomUUID(),
        },
      });

      return await tx.user.update({
        where: { id: user.id },
        data: {
          familyId: member.familyId,
          familyMemberId: member.id,
          isFamilyHead: false,
        },
      });
    });

    return {
      user: this.sanitizeUser(updatedUser),
      ok: true,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new ForbiddenException('User has no local password');
    }

    const ok = await compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.issueAccessToken(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  logout() {
    return { ok: true };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase();

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: {
        email: normalizedEmail,
        otpCode: otp,
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetOtp(normalizedEmail, otp);

    return { ok: true };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const normalizedEmail = dto.email.toLowerCase();

    const record = await this.prisma.passwordReset.findFirst({
      where: {
        email: normalizedEmail,
        otpCode: dto.otpCode,
        isUsed: false,
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid OTP');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const passwordHash = await hash(dto.newPassword, 10);
    if (!passwordHash) {
      throw new Error('Failed to hash password');
    }

    await this.prisma.$transaction([
      this.prisma.passwordReset.update({
        where: { id: record.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          authProvider: 'local',
        },
      }),
    ]);

    return { ok: true };
  }

  async oauthLogin(oauthUser: OAuthUser) {
    if (!oauthUser?.email) {
      throw new UnauthorizedException('Missing OAuth email');
    }

    const email = oauthUser.email.toLowerCase();

    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: null,
        name: oauthUser.name ?? email,
        authProvider: oauthUser.provider,
      },
      update: {
        authProvider: oauthUser.provider,
      },
    });

    const accessToken = await this.issueAccessToken(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private async issueAccessToken(userId: string, email: string) {
    const accessSecret = process.env.JWT_ACCESS_SECRET;

    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not set');
    }

    return await this.jwt.signAsync(
      { sub: userId, email },
      { secret: accessSecret, expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );
  }

  private generateOtp() {
    const code = Math.floor(100000 + Math.random() * 900000);
    return String(code);
  }

  private getCurrentWeekPeriod() {
    const now = new Date();
    const day = now.getDay();
    const daysFromMonday = (day + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - daysFromMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    return { start, end };
  }

  private sanitizeUser(user: UserLike) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      height: user.height,
      weight: user.weight,
      goal: user.goal,
      isFamilyHead: user.isFamilyHead,
      familyId: user.familyId,
      familyMemberId: user.familyMemberId,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
