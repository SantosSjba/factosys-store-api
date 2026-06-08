import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

const stockLevelInclude = {
  warehouse: true,
  variant: {
    include: {
      product: true,
    },
  },
} satisfies Prisma.StockLevelInclude;

@Injectable()
export class PrismaStockRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.stockLevel.findUnique({
      where: { id },
      include: stockLevelInclude,
    });
  }

  findByWarehouseAndVariant(warehouseId: string, variantId: string) {
    return this.prisma.stockLevel.findUnique({
      where: {
        warehouseId_variantId: { warehouseId, variantId },
      },
      include: stockLevelInclude,
    });
  }

  async listPaginated(params: {
    page: number;
    limit: number;
    warehouseId?: string;
    search?: string;
    lowStockOnly?: boolean;
  }) {
    const where: Prisma.StockLevelWhereInput = {
      ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
      ...(params.search
        ? {
            OR: [
              { variant: { sku: { contains: params.search, mode: 'insensitive' } } },
              { variant: { name: { contains: params.search, mode: 'insensitive' } } },
              {
                variant: {
                  product: { name: { contains: params.search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        include: stockLevelInclude,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.stockLevel.count({ where }),
    ]);

    const filtered = params.lowStockOnly
      ? items.filter(
          (item) =>
            item.lowStockThreshold != null &&
            item.quantityOnHand - item.quantityReserved <= item.lowStockThreshold,
        )
      : items;

    return {
      items: params.lowStockOnly ? filtered : items,
      total: params.lowStockOnly ? filtered.length : total,
    };
  }

  update(id: string, data: Prisma.StockLevelUpdateInput) {
    return this.prisma.stockLevel.update({
      where: { id },
      data,
      include: stockLevelInclude,
    });
  }

  findVariantById(variantId: string) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
  }

  searchVariants(search: string, limit = 20) {
    return this.prisma.productVariant.findMany({
      where: {
        isActive: true,
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      },
      include: { product: true },
      orderBy: { sku: 'asc' },
      take: limit,
    });
  }
}

export { stockLevelInclude };
