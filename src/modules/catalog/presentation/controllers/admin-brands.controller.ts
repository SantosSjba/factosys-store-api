import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { memoryStorage } from 'multer';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import { CreateBrandDto } from '../../application/dto/create-brand.dto';
import { UpdateBrandDto } from '../../application/dto/update-brand.dto';
import { BrandsService } from '../../application/services/brands.service';

const logoUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

  @Post(':id/logo')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @UseInterceptors(logoUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir logo de marca' })
  uploadLogo(@Param('id') id: string, @UploadedFile() file: UploadedImageFile) {
    return this.brandsService.uploadBrandLogo(id, file);
  }

  @Delete(':id/logo')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar logo de marca' })
  removeLogo(@Param('id') id: string) {
    return this.brandsService.deleteBrandLogo(id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar marca' })
  remove(@Param('id') id: string) {
    return this.brandsService.deleteBrand(id);
  }
}
