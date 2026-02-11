import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { OpenAiReceiptService } from './openai-receipt.service';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [InventoryController],
  providers: [InventoryService, OpenAiReceiptService],
  exports: [InventoryService],
})
export class InventoryModule {}
