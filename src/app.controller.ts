import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOkResponse({ type: String })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  @Get('health')
  health() {
    return { ok: true };
  }
}
