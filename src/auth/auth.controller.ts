import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import {
  AuthResponseDto,
  SuccessResponseDto,
  JoinFamilyResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import type { OAuthUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCreatedResponse({ type: AuthResponseDto })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOkResponse({ type: AuthResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: SuccessResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @ApiOkResponse({ type: SuccessResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('password-reset/request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @ApiOkResponse({ type: SuccessResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return;
  }

  @ApiOkResponse({ type: AuthResponseDto })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request) {
    return this.authService.oauthLogin(req.user as OAuthUser);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  appleAuth() {
    return;
  }

  @ApiOkResponse({ type: AuthResponseDto })
  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@Req() req: Request) {
    return this.authService.oauthLogin(req.user as OAuthUser);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AuthResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('complete-profile')
  async completeProfile(@Req() req: Request, @Body() dto: CompleteProfileDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.authService.completeProfile(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: JoinFamilyResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post('join-family/:inviteToken')
  async joinFamily(
    @Req() req: Request,
    @Param('inviteToken') inviteToken: string,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.authService.joinFamily(userId, inviteToken);
  }
}
