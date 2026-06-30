import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  StockMovementType,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

const movementInclude = {
  warehouse: true,
  targetWarehouse: true,
  variant: { include: { product: true } },
  performedBy: true,
} satisfies Prisma.StockMovementInclude;

@Injectable()
export class PrismaMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPaginated(params: {
    page: number;
    limit: number;
    warehouseId?: string;
    variantId?: string;
    type?: Prisma.EnumStockMovementTypeFilter['equals'];
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.StockMovementWhereInput = {
      ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
      ...(params.variantId ? { variantId: params.variantId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { note: { contains: params.search, mode: 'insensitive' } },
              {
                variant: {
                  sku: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                variant: {
                  name: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                variant: {
                  product: {
                    name: { contains: params.search, mode: 'insensitive' },
                  },
                },
              },
              {
                performedBy: {
                  email: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                performedBy: {
                  firstName: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                performedBy: {
                  lastName: { contains: params.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.StockMovementCreateInput) {
    return this.prisma.stockMovement.create({
      data,
      include: movementInclude,
    });
  }

  runStockTransaction<T>(
    handler: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.runTransaction(handler);
  }

  getLevelInTransaction(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    variantId: string,
  ) {
    return tx.stockLevel.findUnique({
      where: { warehouseId_variantId: { warehouseId, variantId } },
    });
  }

  upsertLevelInTransaction(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    variantId: string,
    quantityOnHand: number,
  ) {
    return tx.stockLevel.upsert({
      where: { warehouseId_variantId: { warehouseId, variantId } },
      create: {
        warehouseId,
        variantId,
        quantityOnHand,
        quantityReserved: 0,
      },
      update: { quantityOnHand },
    });
  }

  createMovementInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      warehouseId: string;
      variantId: string;
      type: StockMovementType;
      quantityChange: number;
      quantityBefore: number;
      quantityAfter: number;
      note?: string | null;
      performedById?: string | null;
      targetWarehouseId?: string | null;
    },
  ) {
    return tx.stockMovement.create({
      data,
      include: movementInclude,
    });
  }
}

export { movementInclude };
