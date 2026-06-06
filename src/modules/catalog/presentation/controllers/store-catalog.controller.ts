import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared/decorators/public.decorator';
import { ListProductsQueryDto } from '../../application/dto/list-products-query.dto';
import { BrandsService } from '../../application/services/brands.service';
import { CategoriesService } from '../../application/services/categories.service';
import { ProductsService } from '../../application/services/products.service';

@ApiTags('Store Catalog')
@Controller('store/catalog')
export class StoreCatalogController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
    private readonly brandsService: BrandsService,
  ) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Listado público de productos activos' })
  listProducts(@Query() query: ListProductsQueryDto) {
    return this.productsService.listStoreProducts(query);
  }

  @Public()
  @Get('products/:slug')
  @ApiOperation({ summary: 'Detalle público de producto por slug' })
  getProduct(@Param('slug') slug: string) {
    return this.productsService.getStoreProductBySlug(slug);
  }

  @Public()
  @Get('categories/tree')
  @ApiOperation({ summary: 'Árbol de categorías activas' })
  async listCategories() {
    const tree = await this.categoriesService.listTree();
    return this.filterActiveCategories(tree);
  }

  @Public()
  @Get('brands')
  @ApiOperation({ summary: 'Marcas activas' })
  listBrands() {
    return this.brandsService.listActiveBrands();
  }

  private filterActiveCategories<
    T extends { isActive: boolean; children: T[] },
  >(nodes: T[]): T[] {
    return nodes
      .filter((node) => node.isActive)
      .map((node) => ({
        ...node,
        children: this.filterActiveCategories(node.children),
      }));
  }
}
