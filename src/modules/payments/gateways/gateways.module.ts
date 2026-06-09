import { Module } from '@nestjs/common';
import { AdminPaymentGatewaysController } from './admin-payment-gateways.controller';
import { PaymentGatewaysService } from './payment-gateways.service';

@Module({
  controllers: [AdminPaymentGatewaysController],
  providers: [PaymentGatewaysService],
  exports: [PaymentGatewaysService],
})
export class GatewaysModule {}
