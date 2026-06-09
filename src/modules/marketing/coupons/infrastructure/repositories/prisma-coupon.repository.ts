import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';

@Injectable()
export class PrismaCouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async listPaginated(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const where: Prisma.CouponWhereInput = params.search
      ? { code: { contains: params.search.trim(), mode: 'insensitive' } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.CouponCreateInput) {
    return this.prisma.coupon.create({ data });
  }

  update(id: string, data: Prisma.CouponUpdateInput) {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  incrementUsedCount(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  count(where: Prisma.CouponWhereInput = {}) {
    return this.prisma.coupon.count({ where });
  }
}
