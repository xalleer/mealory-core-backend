import { BadRequestException } from '@nestjs/common';
import { MenuService } from './menu.service';

describe('MenuService.updateMealStatus', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    meal: { findUnique: jest.Mock; update: jest.Mock };
  };
  let inventoryService: { deductIngredients: jest.Mock };
  let service: MenuService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      meal: { findUnique: jest.fn(), update: jest.fn() },
    };

    inventoryService = {
      deductIngredients: jest.fn(),
    };

    service = new MenuService(
      prisma as unknown as never,
      {} as never,
      {} as never,
      inventoryService as unknown as never,
    );
  });

  it('does not deduct ingredients when status is not completed', async () => {
    prisma.user.findUnique.mockResolvedValue({ familyId: 'family-1' });
    prisma.meal.findUnique.mockResolvedValue({
      id: 'meal-1',
      status: 'pending',
      completedAt: null,
      day: { menu: { familyId: 'family-1' } },
      recipe: null,
    });
    prisma.meal.update.mockResolvedValue({ id: 'meal-1' });

    await service.updateMealStatus('user-1', 'meal-1', 'cooking');

    expect(inventoryService.deductIngredients).not.toHaveBeenCalled();
    expect(prisma.meal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'cooking', completedAt: null },
      }),
    );
  });

  it('is idempotent for completed status: does not deduct and keeps completedAt', async () => {
    const completedAt = new Date('2026-01-01T00:00:00.000Z');

    prisma.user.findUnique.mockResolvedValue({ familyId: 'family-1' });
    prisma.meal.findUnique.mockResolvedValue({
      id: 'meal-1',
      status: 'completed',
      completedAt,
      day: { menu: { familyId: 'family-1' } },
      recipe: {
        ingredients: [
          {
            productId: 'product-1',
            quantity: { toNumber: () => 2 },
            unit: 'g',
          },
        ],
      },
    });
    prisma.meal.update.mockResolvedValue({ id: 'meal-1' });

    await service.updateMealStatus('user-1', 'meal-1', 'completed');

    expect(inventoryService.deductIngredients).not.toHaveBeenCalled();
    expect(prisma.meal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'completed', completedAt },
      }),
    );
  });

  it('deducts ingredients when switching to completed; if not enough inventory, does not update status', async () => {
    prisma.user.findUnique.mockResolvedValue({ familyId: 'family-1' });
    prisma.meal.findUnique.mockResolvedValue({
      id: 'meal-1',
      status: 'pending',
      completedAt: null,
      day: { menu: { familyId: 'family-1' } },
      recipe: {
        ingredients: [
          {
            productId: 'product-1',
            quantity: { toNumber: () => 2 },
            unit: 'g',
          },
        ],
      },
    });

    inventoryService.deductIngredients.mockRejectedValue(
      new BadRequestException('Not enough inventory to deduct ingredients'),
    );

    await expect(
      service.updateMealStatus('user-1', 'meal-1', 'completed'),
    ).rejects.toThrow(
      new BadRequestException(
        'Not enough ingredients in inventory. Please add products first.',
      ),
    );

    expect(inventoryService.deductIngredients).toHaveBeenCalledWith(
      'family-1',
      [{ productId: 'product-1', quantity: 2, unit: 'g' }],
    );
    expect(prisma.meal.update).not.toHaveBeenCalled();
  });
});
