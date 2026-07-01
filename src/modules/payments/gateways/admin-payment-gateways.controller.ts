import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentGatewayProvider } from '../../../generated/prisma/client';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import { Public } from '../../../shared/decorators/public.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../shared/decorators/user-types.decorator';
import { UpdatePaymentGatewayDto } from './payment-gateway.dto';
import { PaymentGatewaysService } from './payment-gateways.service';

@ApiTags('Admin Payment Gateways')
@Controller()
export class AdminPaymentGatewaysController {
  constructor(private readonly service: PaymentGatewaysService) {}

  @Get('admin/payment-gateways')
  @ApiBearerAuth()
  @UserTypes('STAFF')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Listar pasarelas de pago' })
  listGateways() {
    return this.service.listGateways();
  }

  @Patch('admin/payment-gateways/:provider')
  @ApiBearerAuth()
  @UserTypes('STAFF')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Actualizar pasarela de pago' })
  updateGateway(
    @Param('provider') provider: PaymentGatewayProvider,
    @Body() dto: UpdatePaymentGatewayDto,
  ) {
    return this.service.updateGateway(provider, dto);
  }

  @Get('admin/payment-transactions')
  @ApiBearerAuth()
  @UserTypes('STAFF')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  @ApiOperation({ summary: 'Listar transacciones de pago' })
  listTransactions(@Query('orderId') orderId?: string) {
    return this.service.listTransactions(orderId);
  }

  @Get('admin/payment-gateways/:provider/webhook-setup')
  @ApiBearerAuth()
  @UserTypes('STAFF')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Instrucciones de webhook para Mercado Pago' })
  getWebhookSetup(@Param('provider') provider: PaymentGatewayProvider) {
    if (provider !== PaymentGatewayProvider.MERCADO_PAGO) {
      throw new BadRequestException({
        code: 'WEBHOOK_SETUP_NOT_AVAILABLE',
        message: 'La configuración de webhook solo está disponible para Mercado Pago.',
      });
    }

    return this.service.getMercadoPagoWebhookSetup();
  }

  @Public()
  @Post('webhooks/payments/:provider')
  @ApiOperation({ summary: 'Webhook de pasarela de pago' })
  webhook(
    @Param('provider') provider: PaymentGatewayProvider,
    @Body() payload: Record<string, unknown>,
    @Query('signature') signature?: string,
    @Query('data.id') dataId?: string,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    return this.service.handleWebhook(provider, payload, signature, {
      xSignature,
      xRequestId,
      dataId,
    });
  }
}
