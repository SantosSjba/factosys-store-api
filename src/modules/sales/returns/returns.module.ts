import { Module } from '@nestjs/common';
import { PrismaOrderRepository } from '../infrastructure/repositories/prisma-order.repository';
import { AdminReturnsController } from './admin-returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  controllers: [AdminReturnsController],
  providers: [ReturnsService, PrismaOrderRepository],
  exports: [ReturnsService],
})
export class ReturnsModule {}
