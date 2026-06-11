import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '../../../../generated/prisma/client';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import { ProductsService } from '../../../catalog/application/services/products.service';
import { PrismaProductRepository } from '../../../catalog/infrastructure/repositories/prisma-product.repository';
import { PrismaFavoriteRepository } from '../../infrastructure/repositories/prisma-favorite.repository';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly favoriteRepository: PrismaFavoriteRepository,
    private readonly productRepository: PrismaProductRepository,
    private readonly productsService: ProductsService,
  ) {}

  async listFavorites(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const { items, total } = await this.favoriteRepository.listPaginated({
      userId,
      page,
      limit,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((entry) => ({
        id: entry.id,
        productId: entry.productId,
        createdAt: entry.createdAt.toISOString(),
        product: this.productsService.presentStoreProduct(entry.product),
      })),
      total,
    );
  }

  listFavoriteIds(userId: string) {
    return this.favoriteRepository.listProductIds(userId);
  }

  countFavorites(userId: string) {
    return this.favoriteRepository.countByUser(userId);
  }

  async addFavorite(userId: string, productId: string) {
    const product = await this.productRepository.findById(productId);

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado o no disponible.',
      });
    }

    const existing = await this.favoriteRepository.findByUserAndProduct(
      userId,
      productId,
    );

    if (existing) {
      throw new ConflictException({
        code: 'FAVORITE_ALREADY_EXISTS',
        message: 'El producto ya está en tus favoritos.',
      });
    }

    const favorite = await this.favoriteRepository.create(userId, productId);

    return {
      id: favorite.id,
      productId: favorite.productId,
      createdAt: favorite.createdAt.toISOString(),
    };
  }

  async removeFavorite(userId: string, productId: string) {
    const existing = await this.favoriteRepository.findByUserAndProduct(
      userId,
      productId,
    );

    if (!existing) {
      throw new NotFoundException({
        code: 'FAVORITE_NOT_FOUND',
        message: 'El producto no está en tus favoritos.',
      });
    }

    await this.favoriteRepository.delete(userId, productId);

    return { success: true };
  }
}
