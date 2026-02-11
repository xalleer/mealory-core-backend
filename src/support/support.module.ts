import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { SupportController } from './support.controller';

@Module({
  imports: [AdminModule],
  controllers: [SupportController],
})
export class SupportModule {}
