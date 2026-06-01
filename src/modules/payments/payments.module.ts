import { Module } from '@nestjs/common';
import { GatewaysModule } from './gateways/gateways.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [GatewaysModule, TransactionsModule],
})
export class PaymentsModule {}
