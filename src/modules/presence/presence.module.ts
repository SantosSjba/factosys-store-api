import { Module } from '@nestjs/common';
import { CustomerPresenceService } from './customer-presence.service';
import { StorePresenceController } from './store-presence.controller';

@Module({
  controllers: [StorePresenceController],
  providers: [CustomerPresenceService],
  exports: [CustomerPresenceService],
})
export class PresenceModule {}
