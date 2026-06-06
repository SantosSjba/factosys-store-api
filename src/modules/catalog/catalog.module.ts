import { Module } from '@nestjs/common';
import { AttributesService } from './application/services/attributes.service';
import { BrandsService } from './application/services/brands.service';
import { CategoriesService } from './application/services/categories.service';
import { ProductsService } from './application/services/products.service';
import { PrismaAttributeRepository } from './infrastructure/repositories/prisma-attribute.repository';
import { PrismaBrandRepository } from './infrastructure/repositories/prisma-brand.repository';
import { PrismaCategoryRepository } from './infrastructure/repositories/prisma-category.repository';
import { PrismaProductRepository } from './infrastructure/repositories/prisma-product.repository';
import { AdminAttributesController } from './presentation/controllers/admin-attributes.controller';
import { AdminBrandsController } from './presentation/controllers/admin-brands.controller';
import { AdminCategoriesController } from './presentation/controllers/admin-categories.controller';
import { AdminProductsController } from './presentation/controllers/admin-products.controller';
import { StoreCatalogController } from './presentation/controllers/store-catalog.controller';

@Module({
  controllers: [
    AdminCategoriesController,
    AdminBrandsController,
    AdminAttributesController,
    AdminProductsController,
    StoreCatalogController,
  ],
  providers: [
    PrismaCategoryRepository,
    PrismaBrandRepository,
    PrismaAttributeRepository,
    PrismaProductRepository,
    CategoriesService,
    BrandsService,
    AttributesService,
    ProductsService,
  ],
  exports: [ProductsService, CategoriesService, BrandsService, AttributesService],
})
export class CatalogModule {}
