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
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import {
  ListMovementsQueryDto,
  ListStockQueryDto,
} from '../../application/dto/list-inventory-query.dto';
import {
  CreateStockMovementDto,
  UpdateStockThresholdDto,
} from '../../application/dto/stock-movement.dto';
import { StockService } from '../../application/services/stock.service';

@ApiTags('Admin Inventory')
@ApiBearerAuth()
@Controller('admin/inventory')
@UserTypes('STAFF')
export class AdminStockController {
  constructor(private readonly stockService: StockService) {}

  @Get('stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Listar niveles de stock (paginado)' })
  listStock(@Query() query: ListStockQueryDto) {
    return this.stockService.listStock(query);
  }

  @Patch('stock/:id/threshold')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Actualizar umbral de stock bajo' })
  updateThreshold(
    @Param('id') id: string,
    @Body() dto: UpdateStockThresholdDto,
  ) {
    return this.stockService.updateThreshold(id, dto);
  }

  @Get('movements')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  listMovements(@Query() query: ListMovementsQueryDto) {
    return this.stockService.listMovements(query);
  }

  @Get('variants/lookup')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Buscar variantes por SKU o producto' })
  lookupVariants(@Query('search') search = '') {
    return this.stockService.lookupVariants(search);
  }

  @Post('movements')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Registrar movimiento de inventario' })
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockService.createMovement(dto, user.id);
  }
}
