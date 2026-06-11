import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../../shared/interfaces/jwt-payload.interface';
import { StoreCheckoutQuoteDto } from '../../application/dto/store-checkout-quote.dto';
import { StorePlaceOrderDto } from '../../application/dto/store-place-order.dto';
import { StoreCheckoutService } from '../../application/services/store-checkout.service';

@ApiTags('Store Checkout')
@ApiBearerAuth()
@Controller('store/checkout')
@UserTypes('CUSTOMER')
export class StoreCheckoutController {
  constructor(private readonly checkoutService: StoreCheckoutService) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Configuración pública de checkout (envío, recojo, pagos)',
  })
  getSettings() {
    return this.checkoutService.getSettings();
  }

  @Post('quote')
  @ApiOperation({ summary: 'Cotizar pedido desde el carrito' })
  quote(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StoreCheckoutQuoteDto,
  ) {
    return this.checkoutService.quote(user.id, dto);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Confirmar pedido desde el carrito' })
  placeOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StorePlaceOrderDto,
  ) {
    return this.checkoutService.placeOrder(user.id, dto);
  }
}
