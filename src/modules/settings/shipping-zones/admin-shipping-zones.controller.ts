import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../shared/decorators/user-types.decorator';
import {
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
} from './shipping-zone.dto';
import { ShippingZonesService } from './shipping-zones.service';

@ApiTags('Admin Shipping Zones')
@ApiBearerAuth()
@Controller('admin/settings/shipping-zones')
@UserTypes('STAFF')
export class AdminShippingZonesController {
  constructor(private readonly service: ShippingZonesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Listar zonas de envío' })
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Crear zona de envío' })
  create(@Body() dto: CreateShippingZoneDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Actualizar zona de envío' })
  update(@Param('id') id: string, @Body() dto: UpdateShippingZoneDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Eliminar zona de envío' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
