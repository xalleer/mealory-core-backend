import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FamiliesModule } from './families/families.module';
import { ProductsModule } from './products/products.module';
import { MenuModule } from './menu/menu.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    FamiliesModule,
    ProductsModule,
    MenuModule,
    ShoppingListModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
