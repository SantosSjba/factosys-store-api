import { Module } from '@nestjs/common';
import { AdminShippingZonesController } from './admin-shipping-zones.controller';
import { ShippingZonesService } from './shipping-zones.service';

@Module({
  controllers: [AdminShippingZonesController],
  providers: [ShippingZonesService],
  exports: [ShippingZonesService],
})
export class ShippingZonesModule {}
