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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompleteShoppingDto } from './dto/complete-shopping.dto';
import {
  ShoppingListItemResponseDto,
  ShoppingListResponseDto,
} from './dto/shopping-list-response.dto';
import { UpdateShoppingListItemDto } from './dto/update-item.dto';
import { ShoppingListService } from './shopping-list.service';

class GenerateShoppingListDto {
  @ApiProperty()
  @IsUUID()
  menuId!: string;
}

class CompleteShoppingResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty()
  budgetUsed!: number;

  @ApiProperty({ required: false })
  budgetRemaining?: number | null;

  @ApiProperty({ enum: ['ok', 'overspent'] })
  status!: 'ok' | 'overspent';
}

@ApiTags('shopping-list')
@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: ShoppingListResponseDto })
  @Post('generate')
  async generate(@Req() req: Request, @Body() dto: GenerateShoppingListDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.shoppingListService.generateFromMenu(userId, dto.menuId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ShoppingListResponseDto })
  @Get('current')
  async getCurrent(@Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    return this.shoppingListService.getCurrentList(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ShoppingListItemResponseDto })
  @Patch(':id/items/:itemId')
  async updateItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShoppingListItemDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.shoppingListService.updateItem(userId, id, itemId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CompleteShoppingResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  async complete(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CompleteShoppingDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.shoppingListService.completeShopping(userId, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ShoppingListResponseDto })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { sub: string }).sub;
    return this.shoppingListService.remove(userId, id);
  }
}
