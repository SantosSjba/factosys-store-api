import { Module } from '@nestjs/common';
import { BannersService } from './application/services/banners.service';
import { PrismaBannerRepository } from './infrastructure/repositories/prisma-banner.repository';
import { AdminBannersController } from './presentation/controllers/admin-banners.controller';

@Module({
  controllers: [AdminBannersController],
  providers: [PrismaBannerRepository, BannersService],
  exports: [BannersService],
})
export class BannersModule {}
