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
import { CreateAttributeDto } from '../../application/dto/create-attribute.dto';
import { UpdateAttributeDto } from '../../application/dto/update-attribute.dto';
import { AttributesService } from '../../application/services/attributes.service';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Controller('admin/catalog/attributes')
@UserTypes('STAFF')
export class AdminAttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Listar atributos (paginado)' })
  list(@Query() query: PaginationQueryDto) {
    return this.attributesService.listAttributes(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Crear atributo' })
  create(@Body() dto: CreateAttributeDto) {
    return this.attributesService.createAttribute(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Detalle de atributo' })
  getOne(@Param('id') id: string) {
    return this.attributesService.getAttribute(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Actualizar atributo' })
  update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributesService.updateAttribute(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar atributo' })
  remove(@Param('id') id: string) {
    return this.attributesService.deleteAttribute(id);
  }
}
