import type {
  AttributeDataType,
  AttributeScope,
  ProductStatus,
  ProductType,
} from '../../../../generated/prisma/client';

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  children: CategoryNode[];
};

export type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AttributeRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  dataType: AttributeDataType;
  unit: string | null;
  scope: AttributeScope;
  options: string[];
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductImageRecord = {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  storageKey: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type ProductVariantRecord = {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  name: string | null;
  price: string;
  compareAtPrice: string | null;
  cost: string | null;
  weight: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  attributeValues: Array<{
    attributeId: string;
    attributeSlug: string;
    attributeName: string;
    value: string;
  }>;
};

export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  brandId: string | null;
  brandName: string | null;
  primaryCategoryId: string;
  primaryCategoryName: string;
  productType: ProductType;
  status: ProductStatus;
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categoryIds: string[];
  attributeValues: Array<{
    attributeId: string;
    attributeSlug: string;
    attributeName: string;
    value: string;
  }>;
  variants: ProductVariantRecord[];
  images: ProductImageRecord[];
  defaultPrice: string | null;
  primaryImageUrl: string | null;
};
