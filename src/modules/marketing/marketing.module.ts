import { Module } from '@nestjs/common';
import { BannersModule } from './banners/banners.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CouponsModule } from './coupons/coupons.module';

@Module({
  imports: [CouponsModule, BannersModule, CampaignsModule],
  exports: [CouponsModule],
})
export class MarketingModule {}
