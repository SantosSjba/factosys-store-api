import { Module, forwardRef } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';
import { StoreMercadoPagoController } from './store-mercadopago.controller';

@Module({
  controllers: [StoreMercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
