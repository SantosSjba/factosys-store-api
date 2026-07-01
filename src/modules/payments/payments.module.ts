import { Module } from '@nestjs/common';
import { GatewaysModule } from './gateways/gateways.module';
import { MercadoPagoModule } from './mercadopago/mercadopago.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [GatewaysModule, MercadoPagoModule, TransactionsModule],
})
export class PaymentsModule {}
