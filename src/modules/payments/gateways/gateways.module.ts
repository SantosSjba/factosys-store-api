import { Module } from '@nestjs/common';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { AdminPaymentGatewaysController } from './admin-payment-gateways.controller';
import { PaymentGatewaysService } from './payment-gateways.service';

@Module({
  imports: [MercadoPagoModule],
  controllers: [AdminPaymentGatewaysController],
  providers: [PaymentGatewaysService],
  exports: [PaymentGatewaysService],
})
export class GatewaysModule {}
