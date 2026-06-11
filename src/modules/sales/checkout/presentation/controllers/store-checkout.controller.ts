import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../../shared/decorators/public.decorator';
import { StoreActorParam } from '../../../../../shared/decorators/store-actor.decorator';
import { OptionalJwtAuthGuard } from '../../../../../shared/guards/optional-jwt-auth.guard';
import { StoreActorGuard } from '../../../../../shared/guards/store-actor.guard';
import type { StoreActor } from '../../../../../shared/types/store-actor.type';
import { StoreCheckoutQuoteDto } from '../../application/dto/store-checkout-quote.dto';
import { StorePlaceOrderDto } from '../../application/dto/store-place-order.dto';
import { StoreCheckoutService } from '../../application/services/store-checkout.service';

@ApiTags('Store Checkout')
@Controller('store/checkout')
export class StoreCheckoutController {
  constructor(private readonly checkoutService: StoreCheckoutService) {}

  @Get('settings')
  @Public()
  @ApiOperation({
    summary: 'Configuración pública de checkout (envío, recojo, pagos)',
  })
  getSettings() {
    return this.checkoutService.getSettings();
  }

  @Post('quote')
  @Public()
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard, StoreActorGuard)
  @ApiOperation({ summary: 'Cotizar pedido desde el carrito' })
  quote(
    @StoreActorParam() actor: StoreActor,
    @Body() dto: StoreCheckoutQuoteDto,
  ) {
    return this.checkoutService.quote(actor, dto);
  }

  @Post('orders')
  @Public()
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard, StoreActorGuard)
  @ApiOperation({ summary: 'Confirmar pedido desde el carrito' })
  placeOrder(
    @StoreActorParam() actor: StoreActor,
    @Body() dto: StorePlaceOrderDto,
  ) {
    return this.checkoutService.placeOrder(actor, dto);
  }
}
