import { Injectable } from '@nestjs/common';
import type { Brand, Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaBrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.brand.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.brand.findUnique({ where: { slug } });
  }

  async listPaginated(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const where: Prisma.BrandWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { slug: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.BrandCreateInput) {
    return this.prisma.brand.create({ data });
  }

  update(id: string, data: Prisma.BrandUpdateInput) {
    return this.prisma.brand.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }

  countProducts(brandId: string) {
    return this.prisma.product.count({ where: { brandId } });
  }
}

export type BrandEntity = Brand;
