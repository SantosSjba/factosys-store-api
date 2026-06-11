import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { UpdateStoreProfileDto } from '../../../users/application/dto/update-store-profile.dto';
import { UsersService } from '../../../users/application/services/users.service';
import { OrdersService } from '../../../sales/application/services/orders.service';

@ApiTags('Store Profile')
@ApiBearerAuth()
@Controller('store')
@UserTypes('CUSTOMER')
export class StoreProfileController {
  constructor(
    private readonly usersService: UsersService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del cliente autenticado' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getStoreProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar perfil del cliente autenticado' })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStoreProfileDto,
  ) {
    return this.usersService.updateStoreProfile(user.id, dto);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Direcciones usadas en pedidos del cliente' })
  listMyAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listCustomerAddresses(user.id);
  }
}
