import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import { createMulterMemoryStorage } from '../../../../shared/helpers/multer-memory-storage.helper';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { AssignCategoryAttributesDto } from '../../application/dto/assign-category-attributes.dto';
import { CreateCategoryDto } from '../../application/dto/create-category.dto';
import { UpdateCategoryDto } from '../../application/dto/update-category.dto';
import { CategoriesService } from '../../application/services/categories.service';

const imageUploadInterceptor = FileInterceptor('file', {
  storage: createMulterMemoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

  @Post(':id/image')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir imagen de categoría' })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.categoriesService.uploadCategoryImage(id, file);
  }

  @Delete(':id/image')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar imagen de categoría' })
  removeImage(@Param('id') id: string) {
    return this.categoriesService.deleteCategoryImage(id);
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
