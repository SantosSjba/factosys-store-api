import { Module } from '@nestjs/common';
import { EmailNotificationsModule } from './email/email.module';
import { PushNotificationsModule } from './push/push.module';
import { SmsNotificationsModule } from './sms/sms.module';

@Module({
  imports: [
    EmailNotificationsModule,
    SmsNotificationsModule,
    PushNotificationsModule,
  ],
})
export class NotificationsModule {}
