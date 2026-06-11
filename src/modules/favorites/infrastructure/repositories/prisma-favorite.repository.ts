import { Injectable } from '@nestjs/common';
import { ProductStatus } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  mapProductRecord,
  productDetailInclude,
} from '../../../catalog/application/mappers/product.mapper';

@Injectable()
export class PrismaFavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndProduct(userId: string, productId: string) {
    return this.prisma.productFavorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });
  }

  create(userId: string, productId: string) {
    return this.prisma.productFavorite.create({
      data: { userId, productId },
    });
  }

  delete(userId: string, productId: string) {
    return this.prisma.productFavorite.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });
  }

  async listProductIds(userId: string) {
    const rows = await this.prisma.productFavorite.findMany({
      where: {
        userId,
        product: { status: ProductStatus.ACTIVE },
      },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => row.productId);
  }

  async countByUser(userId: string) {
    return this.prisma.productFavorite.count({
      where: {
        userId,
        product: { status: ProductStatus.ACTIVE },
      },
    });
  }

  async listPaginated(params: {
    userId: string;
    page: number;
    limit: number;
  }) {
    const where = {
      userId: params.userId,
      product: { status: ProductStatus.ACTIVE },
    };

    const [items, total] = await Promise.all([
      this.prisma.productFavorite.findMany({
        where,
        include: {
          product: {
            include: productDetailInclude,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.productFavorite.count({ where }),
    ]);

    return {
      items: items.map((entry) => ({
        id: entry.id,
        productId: entry.productId,
        createdAt: entry.createdAt,
        product: mapProductRecord(entry.product),
      })),
      total,
    };
  }
}
