import { Module } from '@nestjs/common';
import { OrdersService } from '../application/services/orders.service';
import { PrismaOrderRepository } from '../infrastructure/repositories/prisma-order.repository';
import { AdminOrdersController } from '../presentation/controllers/admin-orders.controller';

@Module({
  controllers: [AdminOrdersController],
  providers: [PrismaOrderRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
