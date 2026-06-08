import type { Decimal } from '@prisma/client/runtime/client';
import type { Prisma } from '../../../../generated/prisma/client';
import type { ProductRecord } from '../../domain/types/catalog.types';
import { resolveDisplayPrimaryImage } from '../helpers/product-image.helper';

export const productDetailInclude = {
  brand: true,
  primaryCategory: true,
  categories: { include: { category: true } },
  variants: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      attributeValues: { include: { attribute: true } },
    },
  },
  attributeValues: { include: { attribute: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProductInclude;

export type ProductWithDetails = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

function decimalToString(value: Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export function mapProductRecord(product: ProductWithDetails): ProductRecord {
  const defaultVariant =
    product.variants.find((variant) => variant.isDefault) ??
    product.variants[0] ??
    null;

  const primaryImage = resolveDisplayPrimaryImage(product.images);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    brandId: product.brandId,
    brandName: product.brand?.name ?? null,
    primaryCategoryId: product.primaryCategoryId,
    primaryCategoryName: product.primaryCategory.name,
    productType: product.productType,
    status: product.status,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    tags: product.tags,
    publishedAt: product.publishedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    categoryIds: product.categories.map((entry) => entry.categoryId),
    attributeValues: product.attributeValues.map((entry) => ({
      attributeId: entry.attributeId,
      attributeSlug: entry.attribute.slug,
      attributeName: entry.attribute.name,
      value: entry.value,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      barcode: variant.barcode,
      name: variant.name,
      price: variant.price.toString(),
      compareAtPrice: decimalToString(variant.compareAtPrice),
      cost: decimalToString(variant.cost),
      weight: decimalToString(variant.weight),
      isDefault: variant.isDefault,
      isActive: variant.isActive,
      sortOrder: variant.sortOrder,
      attributeValues: variant.attributeValues.map((entry) => ({
        attributeId: entry.attributeId,
        attributeSlug: entry.attribute.slug,
        attributeName: entry.attribute.name,
        value: entry.value,
      })),
    })),
    images: product.images.map((image) => ({
      id: image.id,
      productId: image.productId,
      variantId: image.variantId,
      url: image.url,
      storageKey: image.storageKey,
      alt: image.alt,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
    })),
    defaultPrice: defaultVariant ? defaultVariant.price.toString() : null,
    primaryImageUrl: primaryImage?.url ?? null,
  };
}
