import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  StockReservationStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

const reservationInclude = {
  warehouse: true,
  variant: { include: { product: true } },
  performedBy: true,
} satisfies Prisma.StockReservationInclude;

@Injectable()
export class PrismaReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.stockReservation.findUnique({
      where: { id },
      include: reservationInclude,
    });
  }

  async listPaginated(params: {
    page: number;
    limit: number;
    status?: StockReservationStatus;
    warehouseId?: string;
    variantId?: string;
    search?: string;
  }) {
    const where: Prisma.StockReservationWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
      ...(params.variantId ? { variantId: params.variantId } : {}),
      ...(params.search
        ? {
            OR: [
              { reference: { contains: params.search, mode: 'insensitive' } },
              { note: { contains: params.search, mode: 'insensitive' } },
              {
                variant: {
                  sku: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                variant: {
                  product: {
                    name: { contains: params.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockReservation.findMany({
        where,
        include: reservationInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.stockReservation.count({ where }),
    ]);

    return { items, total };
  }

  runTransaction<T>(
    handler: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(handler);
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

  updateReservedInTransaction(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    variantId: string,
    quantityReserved: number,
  ) {
    return tx.stockLevel.update({
      where: { warehouseId_variantId: { warehouseId, variantId } },
      data: { quantityReserved },
    });
  }

  createInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      warehouseId: string;
      variantId: string;
      quantity: number;
      reference?: string | null;
      note?: string | null;
      performedById?: string | null;
    },
  ) {
    return tx.stockReservation.create({
      data: {
        ...data,
        status: 'ACTIVE',
      },
      include: reservationInclude,
    });
  }

  releaseInTransaction(tx: Prisma.TransactionClient, id: string) {
    return tx.stockReservation.update({
      where: { id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
      include: reservationInclude,
    });
  }
}

export { reservationInclude };
