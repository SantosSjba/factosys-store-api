import { Module } from '@nestjs/common';
import { PresenceModule } from '../../presence/presence.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [PresenceModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class DashboardModule {}
