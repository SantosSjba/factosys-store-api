import { Module } from '@nestjs/common';
import { CouponsModule } from '../../marketing/coupons/coupons.module';
import { SettingsModule } from '../../settings/settings.module';
import { OrdersModule } from '../orders/orders.module';
import { CartsModule } from '../carts/carts.module';
import { StoreCheckoutService } from './application/services/store-checkout.service';
import { StoreCheckoutController } from './presentation/controllers/store-checkout.controller';

@Module({
  imports: [CartsModule, OrdersModule, SettingsModule, CouponsModule],
  controllers: [StoreCheckoutController],
  providers: [StoreCheckoutService],
})
export class CheckoutModule {}
