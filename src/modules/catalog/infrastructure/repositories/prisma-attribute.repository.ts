import { Injectable } from '@nestjs/common';
import type { Attribute, Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaAttributeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.attribute.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.attribute.findUnique({ where: { slug } });
  }

  findManyByIds(ids: string[]) {
    return this.prisma.attribute.findMany({ where: { id: { in: ids } } });
  }

  async listPaginated(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const where: Prisma.AttributeWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { slug: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.attribute.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.attribute.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.AttributeCreateInput) {
    return this.prisma.attribute.create({ data });
  }

  update(id: string, data: Prisma.AttributeUpdateInput) {
    return this.prisma.attribute.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.attribute.delete({ where: { id } });
  }
}

export type AttributeEntity = Attribute;
