import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { CreateOrderDto } from '../../application/dto/create-order.dto';
import { ListOrdersQueryDto } from '../../application/dto/list-orders-query.dto';
import {
  CancelOrderDto,
  RefundOrderDto,
  UpdateOrderPaymentDto,
  UpdateOrderStatusDto,
} from '../../application/dto/update-order.dto';
import {
  UpdateOrderNotesDto,
  UpdateOrderShipmentDto,
  UploadOrderPaymentEvidenceDto,
} from '../../application/dto/order-pro.dto';
import { OrdersService } from '../../application/services/orders.service';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';

const evidenceUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('Admin Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UserTypes('STAFF')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  @ApiOperation({ summary: 'Listar pedidos (paginado)' })
  listOrders(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.listOrders(query);
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="pedidos.csv"')
  @ApiOperation({ summary: 'Exportar pedidos a CSV' })
  exportOrders(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.exportOrdersCsv(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Crear pedido manual desde admin' })
  createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.createOrder(dto, user.id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  @ApiOperation({ summary: 'Obtener detalle de pedido' })
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Actualizar estado del pedido' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateOrderStatus(id, dto, user.id);
  }

  @Patch(':id/payment')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Actualizar estado de pago del pedido' })
  updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdateOrderPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateOrderPayment(id, dto, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Cancelar pedido' })
  cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelOrder(id, dto, user.id);
  }

  @Post(':id/refund')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Registrar reembolso total o parcial' })
  refundOrder(
    @Param('id') id: string,
    @Body() dto: RefundOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.refundOrder(id, dto, user.id);
  }

  @Patch(':id/shipment')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Actualizar datos de envío/tracking' })
  updateShipment(
    @Param('id') id: string,
    @Body() dto: UpdateOrderShipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateShipment(id, dto, user.id);
  }

  @Patch(':id/notes')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @ApiOperation({ summary: 'Actualizar notas del pedido' })
  updateNotes(
    @Param('id') id: string,
    @Body() dto: UpdateOrderNotesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateNotes(id, dto, user.id);
  }

  @Post(':id/payment-evidence')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  @UseInterceptors(evidenceUpload)
  @ApiOperation({ summary: 'Registrar comprobante de pago' })
  uploadPaymentEvidence(
    @Param('id') id: string,
    @Body() dto: UploadOrderPaymentEvidenceDto,
    @UploadedFile() file: UploadedImageFile,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.uploadPaymentEvidence(id, dto, file, user.id);
  }
}
