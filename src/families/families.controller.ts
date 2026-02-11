import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FamiliesService } from './families.service';
import { GenerateInviteResponseDto } from './dto/families-response.dto';

@ApiTags('families')
@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: GenerateInviteResponseDto })
  @HttpCode(HttpStatus.OK)
  @Post(':familyId/members/:memberId/generate-invite')
  async generateInvite(
    @Req() req: Request,
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.familiesService.generateInvite({
      requesterUserId: userId,
      familyId,
      memberId,
    });
  }
}
