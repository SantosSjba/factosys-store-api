import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import { CreateCustomerDto } from '../../application/dto/create-customer.dto';
import { UsersService } from '../../application/services/users.service';

@ApiTags('Admin Customers')
@ApiBearerAuth()
@Controller('admin/customers')
@UserTypes('STAFF')
export class AdminCustomersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Listar clientes de la tienda (paginado)' })
  listCustomers(@Query() query: PaginationQueryDto) {
    return this.usersService.listCustomerUsers(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  @ApiOperation({ summary: 'Crear cliente de la tienda (cuenta activa)' })
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.usersService.createCustomerUser(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  getCustomer(@Param('id') id: string) {
    return this.usersService.getCustomerUser(id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  @ApiOperation({ summary: 'Dar de baja cliente (soft delete — suspende y cierra sesiones)' })
  softDeleteCustomer(@Param('id') id: string) {
    return this.usersService.softDeleteCustomerUser(id);
  }
}
