import { Module } from '@nestjs/common';
import { CartsModule } from './carts/carts.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { OrdersModule } from './orders/orders.module';
import { ReturnsModule } from './returns/returns.module';

@Module({
  imports: [
    OrdersModule,
    ReturnsModule,
    CartsModule,
    OrderItemsModule,
    CheckoutModule,
  ],
  exports: [OrdersModule, ReturnsModule],
})
export class SalesModule {}
