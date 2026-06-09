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
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from '../../application/dto/currency.dto';
import { CurrenciesService } from '../../application/services/currencies.service';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@Controller('admin/settings/currencies')
@UserTypes('STAFF')
export class AdminCurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Listar monedas (paginado)' })
  list(@Query() query: PaginationQueryDto) {
    return this.currenciesService.listCurrencies(query);
  }

  @Get('active')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Listar monedas activas' })
  listActive() {
    return this.currenciesService.listActiveCurrencies();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Crear moneda' })
  create(@Body() dto: CreateCurrencyDto) {
    return this.currenciesService.createCurrency(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Detalle de moneda' })
  getOne(@Param('id') id: string) {
    return this.currenciesService.getCurrency(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Actualizar moneda' })
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currenciesService.updateCurrency(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Eliminar moneda' })
  remove(@Param('id') id: string) {
    return this.currenciesService.deleteCurrency(id);
  }
}
