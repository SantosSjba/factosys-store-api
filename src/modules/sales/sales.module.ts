import { Module } from '@nestjs/common';
import { CartsModule } from './carts/carts.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [CartsModule, OrdersModule, OrderItemsModule],
})
export class SalesModule {}
