import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaCurrencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.currency.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.currency.findUnique({ where: { code } });
  }

  async listPaginated(params: { page: number; limit: number; search?: string }) {
    const where: Prisma.CurrencyWhereInput = params.search
      ? {
          OR: [
            { code: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.currency.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.currency.count({ where }),
    ]);

    return { items, total };
  }

  listActive() {
    return this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  create(data: Prisma.CurrencyCreateInput) {
    return this.prisma.currency.create({ data });
  }

  update(id: string, data: Prisma.CurrencyUpdateInput) {
    return this.prisma.currency.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.currency.delete({ where: { id } });
  }

  clearDefaultFlag() {
    return this.prisma.currency.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  findDefault() {
    return this.prisma.currency.findFirst({ where: { isDefault: true, isActive: true } });
  }
}
