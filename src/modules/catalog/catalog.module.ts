import { Module } from '@nestjs/common';
import { AttributesModule } from './attributes/attributes.module';
import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { VariantsModule } from './variants/variants.module';

@Module({
  imports: [
    AttributesModule,
    BrandsModule,
    CategoriesModule,
    ProductsModule,
    VariantsModule,
  ],
})
export class CatalogModule {}
