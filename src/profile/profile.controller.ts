import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuccessResponseDto } from '../auth/dto/auth-response.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { FamilyInfoResponseDto } from './dto/family-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdateFamilyBudgetDto } from './dto/update-family-budget.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FamilyHeadGuard } from './guards/family-head.guard';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOkResponse({ type: ProfileResponseDto })
  @Get()
  async getProfile(@Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    return this.profileService.getProfile(userId);
  }

  @ApiOkResponse({ type: ProfileResponseDto })
  @Patch()
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.profileService.updateProfile(userId, dto);
  }

  @ApiOkResponse({ type: SuccessResponseDto })
  @HttpCode(HttpStatus.OK)
  @Patch('email')
  async updateEmail(@Req() req: Request, @Body() dto: UpdateEmailDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.profileService.updateEmail(userId, dto);
  }

  @ApiOkResponse({ type: SuccessResponseDto })
  @HttpCode(HttpStatus.OK)
  @Patch('password')
  async updatePassword(@Req() req: Request, @Body() dto: UpdatePasswordDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.profileService.updatePassword(userId, dto);
  }

  @ApiOkResponse({ type: SuccessResponseDto })
  @HttpCode(HttpStatus.OK)
  @Delete()
  @ApiBody({ type: DeleteAccountDto })
  async deleteAccount(@Req() req: Request, @Body() dto: DeleteAccountDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.profileService.deleteAccount(userId, dto);
  }

  @ApiOkResponse({ type: FamilyInfoResponseDto })
  @Get('family')
  async getFamilyInfo(@Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    return this.profileService.getFamilyInfo(userId);
  }

  @ApiOkResponse({ type: FamilyInfoResponseDto })
  @UseGuards(JwtAuthGuard, FamilyHeadGuard)
  @Patch('family/budget')
  async updateFamilyBudget(
    @Req() req: Request,
    @Body() dto: UpdateFamilyBudgetDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.profileService.updateFamilyBudget(userId, dto);
  }
}
