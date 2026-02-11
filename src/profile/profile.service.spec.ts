import {
  BadRequestException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { compare, hash } from 'bcrypt';

describe('ProfileService', () => {
  let prisma: any;
  let emailService: any;
  let service: ProfileService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      familyMember: {
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      family: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      menu: { deleteMany: jest.fn() },
      shoppingList: { deleteMany: jest.fn() },
      shoppingListItem: { deleteMany: jest.fn() },
      inventory: { deleteMany: jest.fn() },
      supportTicket: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (cb: any) => await cb(prisma)),
    };

    emailService = {
      sendEmailChangedOld: jest.fn(),
      sendEmailChangedNew: jest.fn(),
      sendPasswordChanged: jest.fn(),
      sendAccountDeleted: jest.fn(),
    };

    service = new ProfileService(prisma as never, emailService as never);

    (compare as unknown as jest.Mock).mockResolvedValue(true);
    (hash as unknown as jest.Mock).mockResolvedValue('$2b$10$newHash');
  });

  it('updates profile and syncs family member name', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@a.com',
      name: 'Old',
      height: null,
      weight: null,
      goal: null,
      isFamilyHead: true,
      familyId: 'family-1',
      familyMemberId: 'member-1',
      subscriptionTier: 'free',
      subscriptionExpiresAt: null,
      trialEndsAt: null,
      authProvider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
      password: 'hash',
    });

    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'a@a.com',
      name: 'New Name',
      height: 170,
      weight: 70,
      goal: 'weight_loss',
      isFamilyHead: true,
      familyId: 'family-1',
      familyMemberId: 'member-1',
      subscriptionTier: 'free',
      subscriptionExpiresAt: null,
      trialEndsAt: null,
      authProvider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.updateProfile('user-1', {
      name: 'New Name',
      height: 170,
      weight: 70,
      goal: 'weight_loss' as never,
    });

    expect(prisma.familyMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { name: 'New Name' },
    });
  });

  it('updateEmail checks uniqueness', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'old@a.com',
        password: '$2b$10$hash',
        authProvider: 'local',
      })
      .mockResolvedValueOnce({ id: 'someone-else' });

    await expect(
      service.updateEmail('user-1', { newEmail: 'NEW@a.com', password: '123456' }),
    ).rejects.toThrow(new BadRequestException('Email already in use'));
  });

  it('updatePassword forbids OAuth users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@a.com',
      authProvider: 'google',
      password: null,
    });

    await expect(
      service.updatePassword('user-1', {
        currentPassword: '123456',
        newPassword: '654321',
      }),
    ).rejects.toThrow(
      new BadRequestException('Cannot change password for OAuth users'),
    );
  });

  it('deleteAccount: member requires password for local auth', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@a.com',
      authProvider: 'local',
      password: '$2b$10$hash',
      isFamilyHead: false,
      familyId: 'family-1',
      familyMemberId: 'member-1',
    });

    await expect(
      service.deleteAccount('user-1', {
        confirmation: 'DELETE_MY_ACCOUNT',
      }),
    ).rejects.toThrow(new BadRequestException('Password required for local auth'));
  });

  it('deleteAccount: family head deletes family data and user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@a.com',
      authProvider: 'local',
      password: '$2b$10$hash',
      isFamilyHead: true,
      familyId: 'family-1',
      familyMemberId: 'member-1',
    });

    prisma.user.delete.mockResolvedValue({ id: 'user-1' });

    await service.deleteAccount('user-1', {
      password: '123456',
      confirmation: 'DELETE_MY_ACCOUNT',
    });

    expect(prisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
      where: { shoppingList: { familyId: 'family-1' } },
    });
    expect(prisma.shoppingList.deleteMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1' },
    });
    expect(prisma.menu.deleteMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1' },
    });
    expect(prisma.inventory.deleteMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1' },
    });
    expect(prisma.familyMember.deleteMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1' },
    });
    expect(prisma.family.delete).toHaveBeenCalledWith({
      where: { id: 'family-1' },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(emailService.sendAccountDeleted).toHaveBeenCalledWith('a@a.com');
  });
});
