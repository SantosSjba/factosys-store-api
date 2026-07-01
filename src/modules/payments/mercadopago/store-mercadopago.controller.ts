import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import { ProcessMercadoPagoPaymentDto } from './dto/process-mercadopago-payment.dto';
import { MercadoPagoService } from './mercadopago.service';

type AuthRequest = { user?: AuthenticatedUser };

@ApiTags('Store Mercado Pago')
@Controller('store/payments/mercadopago')
export class StoreMercadoPagoController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  @Public()
  @Get('config')
  @ApiOperation({
    summary: 'Configuración pública de Mercado Pago para el checkout',
  })
  getConfig() {
    return this.mercadoPagoService.getStoreConfig();
  }

  @Public()
  @Get('payment-methods')
  @ApiOperation({
    summary: 'Medios de pago disponibles en Mercado Pago para el checkout',
  })
  getPaymentMethods() {
    return this.mercadoPagoService.getStorePaymentMethods();
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('orders/:orderId/payment-context')
  @ApiOperation({
    summary: 'Contexto del pedido para la página de pago con Mercado Pago',
  })
  getPaymentContext(
    @Param('orderId') orderId: string,
    @Query('email') email: string | undefined,
    @Req() request: AuthRequest,
  ) {
    const user = request.user;
    const payerEmail = email?.trim();

    return this.mercadoPagoService.getOrderPaymentContext(
      orderId,
      {
        customerId: user?.userType === 'CUSTOMER' ? user.id : undefined,
        guestEmail:
          user?.userType === 'CUSTOMER' ? undefined : payerEmail,
      },
      payerEmail,
    );
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('orders/:orderId/pay')
  @ApiOperation({ summary: 'Procesar pago con Checkout API Orders (POST /v1/orders)' })
  payOrder(
    @Param('orderId') orderId: string,
    @Body() dto: ProcessMercadoPagoPaymentDto,
    @Req() request: AuthRequest,
  ) {
    const user = request.user;
    return this.mercadoPagoService.processOrderPayment(orderId, dto, {
      customerId: user?.userType === 'CUSTOMER' ? user.id : undefined,
      guestEmail:
        user?.userType === 'CUSTOMER' ? undefined : dto.payerEmail.trim(),
    });
  }
}
