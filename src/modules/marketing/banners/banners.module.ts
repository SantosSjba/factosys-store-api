import { Module } from '@nestjs/common';
import { BannersService } from './application/services/banners.service';
import { PrismaBannerRepository } from './infrastructure/repositories/prisma-banner.repository';
import { AdminBannersController } from './presentation/controllers/admin-banners.controller';
import { StoreMarketingController } from './presentation/controllers/store-marketing.controller';

@Module({
  controllers: [AdminBannersController, StoreMarketingController],
  providers: [PrismaBannerRepository, BannersService],
  exports: [BannersService],
})
export class BannersModule {}
