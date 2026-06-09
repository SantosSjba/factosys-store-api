import { Module } from '@nestjs/common';
import { CouponsService } from './application/services/coupons.service';
import { PrismaCouponRepository } from './infrastructure/repositories/prisma-coupon.repository';
import { AdminCouponsController } from './presentation/controllers/admin-coupons.controller';

@Module({
  controllers: [AdminCouponsController],
  providers: [PrismaCouponRepository, CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
