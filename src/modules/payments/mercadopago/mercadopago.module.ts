import { Module } from '@nestjs/common';
import { OrdersModule } from '../../sales/orders/orders.module';
import { MercadoPagoService } from './mercadopago.service';
import { StoreMercadoPagoController } from './store-mercadopago.controller';

@Module({
  imports: [OrdersModule],
  controllers: [StoreMercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
