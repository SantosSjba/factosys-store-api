import { Module } from '@nestjs/common';
import { CouponsModule } from '../../marketing/coupons/coupons.module';
import { OrdersService } from '../application/services/orders.service';
import { PrismaOrderRepository } from '../infrastructure/repositories/prisma-order.repository';
import { AdminOrdersController } from '../presentation/controllers/admin-orders.controller';
import { StoreOrdersController } from '../presentation/controllers/store-orders.controller';

@Module({
  imports: [CouponsModule],
  controllers: [AdminOrdersController, StoreOrdersController],
  providers: [PrismaOrderRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
