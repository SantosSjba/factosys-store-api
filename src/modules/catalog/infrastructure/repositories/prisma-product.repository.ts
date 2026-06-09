import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  ProductStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  mapProductRecord,
  productDetailInclude,
} from '../../application/mappers/product.mapper';

@Injectable()
export class PrismaProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: productDetailInclude,
    });
  }

  async listPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    status?: ProductStatus;
    onlyActive?: boolean;
  }) {
    const where: Prisma.ProductWhereInput = {};

    if (params.onlyActive) {
      where.status = 'ACTIVE';
    } else if (params.status) {
      where.status = params.status;
    }

    if (params.brandId) {
      where.brandId = params.brandId;
    }

    if (params.categoryId) {
      where.OR = [
        { primaryCategoryId: params.categoryId },
        { categories: { some: { categoryId: params.categoryId } } },
      ];
    }

    if (params.search) {
      const searchFilter: Prisma.ProductWhereInput = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { slug: { contains: params.search, mode: 'insensitive' } },
          {
            shortDescription: { contains: params.search, mode: 'insensitive' },
          },
          { tags: { has: params.search } },
        ],
      };

      where.AND = Array.isArray(where.AND)
        ? [...where.AND, searchFilter]
        : where.AND
          ? [where.AND, searchFilter]
          : [searchFilter];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productDetailInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map(mapProductRecord),
      total,
    };
  }

  async createWithRelations(data: {
    product: Prisma.ProductCreateInput;
    categoryIds: string[];
    attributeValues: Array<{ attributeId: string; value: string }>;
    variants: Array<{
      sku: string;
      barcode?: string;
      name?: string;
      price: number;
      compareAtPrice?: number;
      cost?: number;
      weight?: number;
      isDefault: boolean;
      isActive: boolean;
      sortOrder: number;
      attributeValues: Array<{ attributeId: string; value: string }>;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...data.product,
          categories:
            data.categoryIds.length > 0
              ? {
                  create: data.categoryIds.map((categoryId) => ({
                    category: { connect: { id: categoryId } },
                  })),
                }
              : undefined,
          attributeValues:
            data.attributeValues.length > 0
              ? {
                  create: data.attributeValues.map((entry) => ({
                    attribute: { connect: { id: entry.attributeId } },
                    value: entry.value,
                  })),
                }
              : undefined,
          variants: {
            create: data.variants.map((variant) => ({
              sku: variant.sku,
              barcode: variant.barcode,
              name: variant.name,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              cost: variant.cost,
              weight: variant.weight,
              isDefault: variant.isDefault,
              isActive: variant.isActive,
              sortOrder: variant.sortOrder,
              attributeValues:
                variant.attributeValues.length > 0
                  ? {
                      create: variant.attributeValues.map((entry) => ({
                        attribute: { connect: { id: entry.attributeId } },
                        value: entry.value,
                      })),
                    }
                  : undefined,
            })),
          },
        },
        include: productDetailInclude,
      });

      return mapProductRecord(product);
    });
  }

  async updateWithRelations(
    id: string,
    data: {
      product: Prisma.ProductUpdateInput;
      categoryIds?: string[];
      attributeValues?: Array<{ attributeId: string; value: string }>;
      variants?: Array<{
        id?: string;
        sku: string;
        barcode?: string;
        name?: string;
        price: number;
        compareAtPrice?: number;
        cost?: number;
        weight?: number;
        isDefault: boolean;
        isActive: boolean;
        sortOrder: number;
        attributeValues: Array<{ attributeId: string; value: string }>;
      }>;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: data.product });

      if (data.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (data.categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
            })),
          });
        }
      }

      if (data.attributeValues) {
        await tx.productAttributeValue.deleteMany({ where: { productId: id } });
        if (data.attributeValues.length > 0) {
          await tx.productAttributeValue.createMany({
            data: data.attributeValues.map((entry) => ({
              productId: id,
              attributeId: entry.attributeId,
              value: entry.value,
            })),
          });
        }
      }

      if (data.variants) {
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true },
        });
        const existingIds = new Set(existingVariants.map((entry) => entry.id));
        const payloadIds = new Set(
          data.variants
            .map((variant) => variant.id)
            .filter((variantId): variantId is string => Boolean(variantId)),
        );

        const idsToRemove = [...existingIds].filter(
          (variantId) => !payloadIds.has(variantId),
        );

        if (idsToRemove.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: idsToRemove }, productId: id },
          });
        }

        for (const variant of data.variants) {
          const variantData = {
            sku: variant.sku,
            barcode: variant.barcode,
            name: variant.name,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            cost: variant.cost,
            weight: variant.weight,
            isDefault: variant.isDefault,
            isActive: variant.isActive,
            sortOrder: variant.sortOrder,
          };

          let variantId: string;

          if (variant.id && existingIds.has(variant.id)) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: variantData,
            });
            variantId = variant.id;
            await tx.variantAttributeValue.deleteMany({
              where: { variantId },
            });
          } else {
            const createdVariant = await tx.productVariant.create({
              data: {
                productId: id,
                ...variantData,
              },
            });
            variantId = createdVariant.id;
          }

          if (variant.attributeValues.length > 0) {
            await tx.variantAttributeValue.createMany({
              data: variant.attributeValues.map((entry) => ({
                variantId,
                attributeId: entry.attributeId,
                value: entry.value,
              })),
            });
          }
        }
      }

      const product = await tx.product.findUniqueOrThrow({
        where: { id },
        include: productDetailInclude,
      });

      return mapProductRecord(product);
    });
  }

  delete(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  slugExists(slug: string, excludeId?: string) {
    return this.prisma.product.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  skuExists(sku: string, excludeProductId?: string) {
    return this.prisma.productVariant.findFirst({
      where: {
        sku,
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: { id: true },
    });
  }

  createImage(data: {
    productId: string;
    variantId?: string;
    url: string;
    storageKey: string;
    alt?: string;
    sortOrder: number;
    isPrimary: boolean;
    mimeType?: string;
    sizeBytes?: number;
  }) {
    return this.prisma.productImage.create({ data });
  }

  findImageById(id: string) {
    return this.prisma.productImage.findUnique({ where: { id } });
  }

  deleteImage(id: string) {
    return this.prisma.productImage.delete({ where: { id } });
  }

  async clearPrimaryImage(productId: string, exceptId?: string) {
    await this.prisma.productImage.updateMany({
      where: {
        productId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isPrimary: false },
    });
  }

  findImagesByProductId(productId: string) {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateImagesSortOrder(productId: string, orderedImageIds: string[]) {
    await this.prisma.$transaction(
      orderedImageIds.map((id, index) =>
        this.prisma.productImage.update({
          where: { id, productId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  setImagePrimary(id: string, productId: string) {
    return this.prisma.productImage.update({
      where: { id, productId },
      data: { isPrimary: true },
    });
  }

  unsetImagePrimary(id: string, productId: string) {
    return this.prisma.productImage.update({
      where: { id, productId },
      data: { isPrimary: false },
    });
  }
}
