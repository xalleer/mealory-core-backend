import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { OpenAiService } from './openai.service';

@Module({
  imports: [PrismaModule],
  controllers: [MenuController],
  providers: [MenuService, OpenAiService],
})
export class MenuModule {}
