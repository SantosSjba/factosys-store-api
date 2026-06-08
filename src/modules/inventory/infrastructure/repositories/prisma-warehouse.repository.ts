import { Injectable } from '@nestjs/common';
import type { Prisma, Warehouse } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaWarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.warehouse.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.warehouse.findUnique({ where: { code } });
  }

  findDefault() {
    return this.prisma.warehouse.findFirst({ where: { isDefault: true } });
  }

  async listPaginated(params: { page: number; limit: number; search?: string }) {
    const where: Prisma.WarehouseWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return { items, total };
  }

  listActive() {
    return this.prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  create(data: Prisma.WarehouseCreateInput) {
    return this.prisma.warehouse.create({ data });
  }

  update(id: string, data: Prisma.WarehouseUpdateInput) {
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.warehouse.delete({ where: { id } });
  }

  clearDefaultFlag(exceptId?: string) {
    return this.prisma.warehouse.updateMany({
      where: exceptId ? { id: { not: exceptId } } : {},
      data: { isDefault: false },
    });
  }

  countStockLevels(warehouseId: string) {
    return this.prisma.stockLevel.count({
      where: {
        warehouseId,
        OR: [{ quantityOnHand: { gt: 0 } }, { quantityReserved: { gt: 0 } }],
      },
    });
  }
}

export type WarehouseEntity = Warehouse;
