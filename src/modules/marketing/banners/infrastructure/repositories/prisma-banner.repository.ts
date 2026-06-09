import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';

@Injectable()
export class PrismaBannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.banner.findUnique({ where: { id } });
  }

  async listPaginated(params: { page: number; limit: number; search?: string }) {
    const where: Prisma.BannerWhereInput = params.search
      ? {
          OR: [
            { title: { contains: params.search, mode: 'insensitive' } },
            { subtitle: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.banner.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.BannerCreateInput) {
    return this.prisma.banner.create({ data });
  }

  update(id: string, data: Prisma.BannerUpdateInput) {
    return this.prisma.banner.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }
}
