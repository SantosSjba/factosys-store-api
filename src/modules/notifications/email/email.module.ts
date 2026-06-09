import { Module } from '@nestjs/common';
import { OrderEmailListener } from './order-email.listener';

@Module({
  providers: [OrderEmailListener],
})
export class EmailNotificationsModule {}
