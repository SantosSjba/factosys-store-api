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
  CreateTaxRateDto,
  UpdateTaxRateDto,
} from '../../application/dto/tax.dto';
import { TaxesService } from '../../application/services/taxes.service';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@Controller('admin/settings/taxes')
@UserTypes('STAFF')
export class AdminTaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Listar impuestos (paginado)' })
  list(@Query() query: PaginationQueryDto) {
    return this.taxesService.listTaxRates(query);
  }

  @Get('active')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Listar impuestos activos' })
  listActive() {
    return this.taxesService.listActiveTaxRates();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Crear impuesto' })
  create(@Body() dto: CreateTaxRateDto) {
    return this.taxesService.createTaxRate(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Detalle de impuesto' })
  getOne(@Param('id') id: string) {
    return this.taxesService.getTaxRate(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Actualizar impuesto' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxRateDto) {
    return this.taxesService.updateTaxRate(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Eliminar impuesto' })
  remove(@Param('id') id: string) {
    return this.taxesService.deleteTaxRate(id);
  }
}
