import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
  UpdateOrderPaymentDto,
  UpdateOrderStatusDto,
} from '../../application/dto/update-order.dto';
import { OrdersService } from '../../application/services/orders.service';

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
}
