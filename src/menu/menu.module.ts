import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShoppingListModule } from '../shopping-list/shopping-list.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { OpenAiService } from './openai.service';

@Module({
  imports: [PrismaModule, ShoppingListModule, InventoryModule],
  controllers: [MenuController],
  providers: [MenuService, OpenAiService],
})
export class MenuModule {}
