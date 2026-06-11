import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { ListStoreOrdersQueryDto } from '../../application/dto/list-store-orders-query.dto';
import { OrdersService } from '../../application/services/orders.service';

@ApiTags('Store Orders')
@ApiBearerAuth()
@Controller('store/orders')
@UserTypes('CUSTOMER')
export class StoreOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos del cliente autenticado' })
  listMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStoreOrdersQueryDto,
  ) {
    return this.ordersService.listCustomerOrders(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de pedido del cliente autenticado' })
  getMyOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.ordersService.getCustomerOrder(user.id, id);
  }
}
