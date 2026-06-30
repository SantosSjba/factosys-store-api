import { Injectable } from '@nestjs/common';
import type { Category, Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  listAll() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  create(data: Prisma.CategoryCreateInput) {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  countChildren(parentId: string) {
    return this.prisma.category.count({ where: { parentId } });
  }

  countProducts(categoryId: string) {
    return this.prisma.product.count({
      where: {
        OR: [
          { primaryCategoryId: categoryId },
          { categories: { some: { categoryId } } },
        ],
      },
    });
  }

  replaceCategoryAttributes(
    categoryId: string,
    attributes: Array<{
      attributeId: string;
      isRequired: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.prisma.runBatchTransaction([
      this.prisma.categoryAttribute.deleteMany({ where: { categoryId } }),
      this.prisma.categoryAttribute.createMany({
        data: attributes.map((item) => ({
          categoryId,
          attributeId: item.attributeId,
          isRequired: item.isRequired,
          sortOrder: item.sortOrder,
        })),
      }),
    ]);
  }

  listCategoryAttributes(categoryId: string) {
    return this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: { attribute: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}

export type CategoryEntity = Category;
