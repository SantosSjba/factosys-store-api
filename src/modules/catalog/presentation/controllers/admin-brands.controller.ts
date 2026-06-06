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
import { CreateBrandDto } from '../../application/dto/create-brand.dto';
import { UpdateBrandDto } from '../../application/dto/update-brand.dto';
import { BrandsService } from '../../application/services/brands.service';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Controller('admin/catalog/brands')
@UserTypes('STAFF')
export class AdminBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Listar marcas (paginado)' })
  list(@Query() query: PaginationQueryDto) {
    return this.brandsService.listBrands(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Crear marca' })
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.createBrand(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Detalle de marca' })
  getOne(@Param('id') id: string) {
    return this.brandsService.getBrand(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Actualizar marca' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.updateBrand(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar marca' })
  remove(@Param('id') id: string) {
    return this.brandsService.deleteBrand(id);
  }
}
