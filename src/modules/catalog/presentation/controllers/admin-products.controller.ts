import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../../shared/interfaces/jwt-payload.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { createMulterMemoryStorage } from '../../../../shared/helpers/multer-memory-storage.helper';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import { ListProductsQueryDto } from '../../application/dto/list-products-query.dto';
import {
  CreateProductDto,
  UpdateProductDto,
} from '../../application/dto/product-payload.dto';
import { ReorderProductImagesDto } from '../../application/dto/reorder-product-images.dto';
import { SetProductImagePrimaryDto } from '../../application/dto/set-product-image-primary.dto';
import { ProductsImportExportService } from '../../application/services/products-import-export.service';
import { ProductsService } from '../../application/services/products.service';

const imageUploadInterceptor = FileInterceptor('file', {
  storage: createMulterMemoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Controller('admin/catalog/products')
@UserTypes('STAFF')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly importExportService: ProductsImportExportService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Listar productos (paginado)' })
  list(@Query() query: ListProductsQueryDto) {
    return this.productsService.listAdminProducts(query);
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="catalogo-productos.csv"',
  )
  @ApiOperation({ summary: 'Exportar catálogo CSV' })
  exportCatalog() {
    return this.importExportService.exportProductsCsv();
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Importar catálogo CSV' })
  importCatalog(
    @Body('csv') csv: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importExportService.importProductsCsv(csv, user.id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Detalle de producto' })
  getOne(@Param('id') id: string) {
    return this.productsService.getAdminProduct(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar producto' })
  remove(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }

  @Post(':id/images')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        variantId: { type: 'string' },
        alt: { type: 'string' },
        isPrimary: { type: 'boolean' },
      },
    },
  })
  @ApiOperation({ summary: 'Subir imagen de producto a MinIO/S3' })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
    @Body('variantId') variantId?: string,
    @Body('alt') alt?: string,
    @Body('isPrimary') isPrimary?: string,
  ) {
    return this.productsService.uploadProductImage(id, file, {
      variantId: variantId || undefined,
      alt: alt || undefined,
      isPrimary: isPrimary === 'true',
    });
  }

  @Patch(':id/images/order')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Reordenar imágenes del producto' })
  reorderImages(@Param('id') id: string, @Body() dto: ReorderProductImagesDto) {
    return this.productsService.reorderProductImages(id, dto.imageIds);
  }

  @Patch(':id/images/:imageId/primary')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Marcar o quitar imagen como principal' })
  setPrimaryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: SetProductImagePrimaryDto,
  ) {
    return this.productsService.setProductImagePrimary(
      id,
      imageId,
      dto.isPrimary !== false,
    );
  }

  @Delete(':id/images/:imageId')
  @RequirePermissions(PERMISSIONS.PRODUCTS_WRITE)
  @ApiOperation({ summary: 'Eliminar imagen de producto' })
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.deleteProductImage(id, imageId);
  }
}
