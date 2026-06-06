import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { AssignCategoryAttributesDto } from '../../application/dto/assign-category-attributes.dto';
import { CreateCategoryDto } from '../../application/dto/create-category.dto';
import { UpdateCategoryDto } from '../../application/dto/update-category.dto';
import { CategoriesService } from '../../application/services/categories.service';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Controller('admin/catalog/categories')
@UserTypes('STAFF')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('tree')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Árbol de categorías' })
  listTree() {
    return this.categoriesService.listTree();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Listado plano de categorías' })
  listFlat() {
    return this.categoriesService.listFlat();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Crear categoría' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Detalle de categoría' })
  getOne(@Param('id') id: string) {
    return this.categoriesService.getCategory(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Actualizar categoría' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @Put(':id/attributes')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Asignar atributos a una categoría' })
  assignAttributes(
    @Param('id') id: string,
    @Body() dto: AssignCategoryAttributesDto,
  ) {
    return this.categoriesService.assignAttributes(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar categoría' })
  remove(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
