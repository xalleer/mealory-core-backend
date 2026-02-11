import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MEASUREMENT_UNIT_VALUES } from '../products/products.types';
import { PrismaService } from '../prisma/prisma.service';
import { AddProductDto } from './dto/add-product.dto';
import { InventoryListResponseDto } from './dto/inventory-list-response.dto';
import { InventoryResponseDto } from './dto/inventory-response.dto';
import { ScanReceiptDto } from './dto/scan-receipt.dto';
import { ScanReceiptResponseDto } from './dto/scan-receipt-response.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';
import { OpenAiReceiptService } from './openai-receipt.service';

class InventoryQueryDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiringInDays?: number;
}

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly openAiReceiptService: OpenAiReceiptService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiCreatedResponse({ type: InventoryResponseDto })
  @Post()
  async addProduct(@Req() req: Request, @Body() dto: AddProductDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.inventoryService.addProduct(userId, dto);
  }

  @ApiOkResponse({ type: InventoryListResponseDto })
  @ApiQuery({ name: 'expiringInDays', required: false, type: Number })
  @Get()
  async findAll(@Req() req: Request, @Query() query: InventoryQueryDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.inventoryService.findAll(userId, {
      ...(query.expiringInDays !== undefined && {
        expiringInDays: query.expiringInDays,
      }),
    });
  }

  @ApiOkResponse({ type: InventoryResponseDto })
  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { sub: string }).sub;
    return this.inventoryService.findOne(userId, id);
  }

  @ApiOkResponse({ type: InventoryResponseDto })
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.inventoryService.update(userId, id, dto);
  }

  @ApiOkResponse({ type: InventoryResponseDto })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { sub: string }).sub;
    return this.inventoryService.remove(userId, id);
  }

  @ApiOkResponse({ type: ScanReceiptResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('scan-receipt')
  async scanReceipt(@Body() dto: ScanReceiptDto) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return this.openAiReceiptService.scanReceipt(dto.receiptImage, products);
  }

  @ApiOkResponse({ type: InventoryListResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('confirm-receipt')
  async confirmReceipt(
    @Req() req: Request,
    @Body() dto: ScanReceiptResponseDto,
  ) {
    const userId = (req.user as { sub: string }).sub;

    const created: Awaited<
      ReturnType<typeof this.inventoryService.addProduct>
    >[] = [];

    for (const item of dto.items) {
      if (!item.productId) {
        continue;
      }

      const unit = MEASUREMENT_UNIT_VALUES.find(u => u === item.unit);
      if (!unit) {
        continue;
      }

      created.push(
        await this.inventoryService.addProduct(userId, {
          productId: item.productId,
          quantity: item.quantity,
          unit,
          deductFromBudget: true,
          actualPrice: item.price,
        }),
      );
    }

    return {
      items: created,
      total: created.length,
    };
  }
}
