import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvite(params: {
    requesterUserId: string;
    familyId: string;
    memberId: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.requesterUserId },
    });
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    if (!user.familyId || user.familyId !== params.familyId) {
      throw new ForbiddenException('User is not in this family');
    }
    if (!user.isFamilyHead) {
      throw new ForbiddenException('Only family head can generate invites');
    }

    const member = await this.prisma.familyMember.findUnique({
      where: { id: params.memberId },
    });
    if (!member || member.familyId !== params.familyId) {
      throw new NotFoundException('Family member not found');
    }

    if (member.userId) {
      throw new BadRequestException('Member already registered');
    }

    const updated = await this.prisma.familyMember.update({
      where: { id: member.id },
      data: { inviteToken: randomUUID() },
    });

    return {
      inviteToken: updated.inviteToken,
      familyId: updated.familyId,
      memberId: updated.id,
    };
  }
}
