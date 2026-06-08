import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaTaxRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.taxRate.findUnique({ where: { id } });
  }

  async listPaginated(params: { page: number; limit: number; search?: string }) {
    const where: Prisma.TaxRateWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.taxRate.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.taxRate.count({ where }),
    ]);

    return { items, total };
  }

  listActive() {
    return this.prisma.taxRate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  create(data: Prisma.TaxRateCreateInput) {
    return this.prisma.taxRate.create({ data });
  }

  update(id: string, data: Prisma.TaxRateUpdateInput) {
    return this.prisma.taxRate.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.taxRate.delete({ where: { id } });
  }

  clearDefaultFlag() {
    return this.prisma.taxRate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  findDefault() {
    return this.prisma.taxRate.findFirst({ where: { isDefault: true, isActive: true } });
  }
}
