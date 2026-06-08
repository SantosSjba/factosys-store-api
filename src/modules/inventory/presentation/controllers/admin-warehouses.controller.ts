import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
} from '../../application/dto/warehouse.dto';
import { WarehousesService } from '../../application/services/warehouses.service';

@ApiTags('Admin Inventory')
@ApiBearerAuth()
@Controller('admin/inventory/warehouses')
@UserTypes('STAFF')
export class AdminWarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Listar almacenes (paginado)' })
  list(@Query() query: PaginationQueryDto) {
    return this.warehousesService.listWarehouses(query);
  }

  @Get('active')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Listar almacenes activos (lookup)' })
  listActive() {
    return this.warehousesService.listActiveWarehouses();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Crear almacén' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.createWarehouse(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Detalle de almacén' })
  getOne(@Param('id') id: string) {
    return this.warehousesService.getWarehouse(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Actualizar almacén' })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.updateWarehouse(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Eliminar almacén' })
  remove(@Param('id') id: string) {
    return this.warehousesService.deleteWarehouse(id);
  }
}
