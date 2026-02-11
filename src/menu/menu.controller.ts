import {
  Body,
  Controller,
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
  ApiOkResponse,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateMenuDto } from './dto/generate-menu.dto';
import { RegenerateMenuDto } from './dto/regenerate-menu.dto';
import { MealResponseDto, MenuResponseDto } from './dto/menu-response.dto';
import { UpdateMealStatusDto } from './dto/update-meal-status.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: MenuResponseDto })
  @Post('generate')
  async generateMenu(@Req() req: Request, @Body() dto: GenerateMenuDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.menuService.generateMenu(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MenuResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':menuId/regenerate')
  async regenerateMenu(
    @Req() req: Request,
    @Param('menuId') menuId: string,
    @Body() dto: RegenerateMenuDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.menuService.regenerateMenu(userId, menuId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MenuResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('days/:dayId/regenerate')
  async regenerateDay(
    @Req() req: Request,
    @Param('dayId') dayId: string,
    @Body() dto: RegenerateMenuDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.menuService.regenerateDay(userId, dayId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MenuResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('meals/:mealId/regenerate')
  async regenerateMeal(
    @Req() req: Request,
    @Param('mealId') mealId: string,
    @Body() dto: RegenerateMenuDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.menuService.regenerateMeal(userId, mealId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MenuResponseDto })
  @Get('current')
  async getCurrentMenu(@Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    return this.menuService.getCurrentMenu(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MealResponseDto })
  @HttpCode(HttpStatus.OK)
  @Patch('meals/:mealId/status')
  async updateMealStatus(
    @Req() req: Request,
    @Param('mealId') mealId: string,
    @Body() dto: UpdateMealStatusDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.menuService.updateMealStatus(userId, mealId, dto.status);
  }
}
