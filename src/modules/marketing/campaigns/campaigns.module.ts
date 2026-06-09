import { Module } from '@nestjs/common';
import { CampaignsService } from './application/services/campaigns.service';
import { PrismaCampaignRepository } from './infrastructure/repositories/prisma-campaign.repository';
import { AdminCampaignsController } from './presentation/controllers/admin-campaigns.controller';

@Module({
  controllers: [AdminCampaignsController],
  providers: [PrismaCampaignRepository, CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
