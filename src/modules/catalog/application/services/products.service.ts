import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Attribute } from '../../../../generated/prisma/client';
import {
  AttributeScope,
  ProductStatus,
  ProductType,
} from '../../../../generated/prisma/client';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { ensureUniqueSlug } from '../../../../shared/helpers/slug.helper';
import { StorageService } from '../../../../infrastructure/storage/storage.service';
import { PrismaAttributeRepository } from '../../infrastructure/repositories/prisma-attribute.repository';
import { PrismaBrandRepository } from '../../infrastructure/repositories/prisma-brand.repository';
import { PrismaCategoryRepository } from '../../infrastructure/repositories/prisma-category.repository';
import { PrismaProductRepository } from '../../infrastructure/repositories/prisma-product.repository';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import {
  CreateProductDto,
  CreateProductVariantDto,
  UpdateProductDto,
} from '../dto/product-payload.dto';
import type { ProductRecord } from '../../domain/types/catalog.types';
import { resolveDisplayPrimaryImage } from '../helpers/product-image.helper';
import { mapProductRecord } from '../mappers/product.mapper';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: PrismaProductRepository,
    private readonly categoryRepository: PrismaCategoryRepository,
    private readonly brandRepository: PrismaBrandRepository,
    private readonly attributeRepository: PrismaAttributeRepository,
    private readonly storageService: StorageService,
  ) {}

  async listAdminProducts(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.productRepository.listPaginated({
      page,
      limit,
      search: query.search,
      categoryId: query.categoryId,
      brandId: query.brandId,
      status: query.status,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.presentProduct(item)),
      total,
    );
  }

  async listStoreProducts(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const { items, total } = await this.productRepository.listPaginated({
      page,
      limit,
      search: query.search,
      categoryId: query.categoryId,
      brandId: query.brandId,
      onlyActive: true,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.presentProduct(item)),
      total,
    );
  }

  async getAdminProduct(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }

    return this.presentProduct(mapProductRecord(product));
  }

  async getStoreProductBySlug(slug: string) {
    const product = await this.productRepository.findBySlug(slug);
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }

    return this.presentProduct(mapProductRecord(product));
  }

  async createProduct(dto: CreateProductDto) {
    await this.assertCatalogReferences(dto.primaryCategoryId, dto.brandId);
    this.assertVariants(dto.productType ?? ProductType.SIMPLE, dto.variants);
    await this.assertUniqueSkus(dto.variants);
    await this.validateAttributeValues(
      dto.attributeValues ?? [],
      dto.variants,
      AttributeScope.PRODUCT,
      AttributeScope.VARIANT,
    );

    const slug = await ensureUniqueSlug(dto.slug ?? dto.name, async (value) =>
      Boolean(await this.productRepository.slugExists(value)),
    );

    const categoryIds = this.normalizeCategoryIds(
      dto.primaryCategoryId,
      dto.categoryIds,
    );

    const status = dto.status ?? ProductStatus.DRAFT;

    const created = await this.productRepository.createWithRelations({
      product: {
        name: dto.name.trim(),
        slug,
        shortDescription: dto.shortDescription?.trim() ?? null,
        description: dto.description ?? null,
        productType: dto.productType ?? ProductType.SIMPLE,
        status,
        metaTitle: dto.metaTitle?.trim() ?? null,
        metaDescription: dto.metaDescription?.trim() ?? null,
        tags: dto.tags ?? [],
        publishedAt: status === ProductStatus.ACTIVE ? new Date() : null,
        brand: dto.brandId ? { connect: { id: dto.brandId } } : undefined,
        primaryCategory: { connect: { id: dto.primaryCategoryId } },
      },
      categoryIds,
      attributeValues: dto.attributeValues ?? [],
      variants: this.normalizeVariants(dto.variants),
    });

    return this.presentProduct(created);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }

    if (dto.primaryCategoryId || dto.brandId !== undefined) {
      await this.assertCatalogReferences(
        dto.primaryCategoryId ?? existing.primaryCategoryId,
        dto.brandId === null ? undefined : dto.brandId ?? existing.brandId ?? undefined,
      );
    }

    if (dto.variants) {
      const productType = dto.productType ?? existing.productType;
      this.assertVariants(productType, dto.variants);
      await this.assertUniqueSkus(dto.variants, id);
      await this.validateAttributeValues(
        dto.attributeValues ?? [],
        dto.variants,
        AttributeScope.PRODUCT,
        AttributeScope.VARIANT,
      );
    }

    let slug = existing.slug;
    if (dto.slug || dto.name) {
      slug = await ensureUniqueSlug(
        dto.slug ?? dto.name ?? existing.name,
        async (value) => {
          const found = await this.productRepository.slugExists(value, id);
          return Boolean(found);
        },
      );
    }

    const nextStatus = dto.status ?? existing.status;
    const publishedAt =
      nextStatus === ProductStatus.ACTIVE
        ? existing.publishedAt ?? new Date()
        : nextStatus === ProductStatus.DRAFT
          ? null
          : existing.publishedAt;

    const updated = await this.productRepository.updateWithRelations(id, {
      product: {
        name: dto.name?.trim(),
        slug,
        shortDescription:
          dto.shortDescription !== undefined
            ? dto.shortDescription?.trim() ?? null
            : undefined,
        description: dto.description,
        productType: dto.productType,
        status: dto.status,
        metaTitle:
          dto.metaTitle !== undefined ? dto.metaTitle?.trim() ?? null : undefined,
        metaDescription:
          dto.metaDescription !== undefined
            ? dto.metaDescription?.trim() ?? null
            : undefined,
        tags: dto.tags,
        publishedAt,
        brand:
          dto.brandId !== undefined
            ? dto.brandId
              ? { connect: { id: dto.brandId } }
              : { disconnect: true }
            : undefined,
        primaryCategory: dto.primaryCategoryId
          ? { connect: { id: dto.primaryCategoryId } }
          : undefined,
      },
      categoryIds:
        dto.categoryIds || dto.primaryCategoryId
          ? this.normalizeCategoryIds(
              dto.primaryCategoryId ?? existing.primaryCategoryId,
              dto.categoryIds ??
                existing.categories.map((entry) => entry.categoryId),
            )
          : undefined,
      attributeValues: dto.attributeValues,
      variants: dto.variants ? this.normalizeVariants(dto.variants) : undefined,
    });

    return this.presentProduct(updated);
  }

  async deleteProduct(id: string) {
    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }

    for (const image of existing.images) {
      await this.storageService.deleteObject(image.storageKey);
    }

    await this.productRepository.delete(id);
    return { message: 'Producto eliminado correctamente.' };
  }

  async uploadProductImage(
    productId: string,
    file: UploadedImageFile,
    options?: { variantId?: string; alt?: string; isPrimary?: boolean },
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'Debes enviar un archivo de imagen.',
      });
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }

    if (options?.variantId) {
      const variant = product.variants.find(
        (entry) => entry.id === options.variantId,
      );
      if (!variant) {
        throw new NotFoundException({
          code: 'VARIANT_NOT_FOUND',
          message: 'Variante no encontrada.',
        });
      }
    }

    const uploaded = await this.storageService.uploadObject({
      folder: `catalog/products/${productId}`,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const isPrimary = options?.isPrimary ?? product.images.length === 0;
    if (isPrimary) {
      await this.productRepository.clearPrimaryImage(productId);
    }

    const image = await this.productRepository.createImage({
      productId,
      variantId: options?.variantId,
      url: uploaded.url,
      storageKey: uploaded.storageKey,
      alt: options?.alt ?? product.name,
      sortOrder: product.images.length,
      isPrimary,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
    });

    return this.mapProductImage(image);
  }

  async deleteProductImage(productId: string, imageId: string) {
    const image = await this.productRepository.findImageById(imageId);
    if (!image || image.productId !== productId) {
      throw new NotFoundException({
        code: 'PRODUCT_IMAGE_NOT_FOUND',
        message: 'Imagen no encontrada.',
      });
    }

    const wasPrimary = image.isPrimary;

    await this.storageService.deleteObject(image.storageKey);
    await this.productRepository.deleteImage(imageId);

    if (wasPrimary) {
      const remaining = await this.productRepository.findImagesByProductId(productId);
      if (remaining[0]) {
        await this.productRepository.clearPrimaryImage(productId, remaining[0].id);
        await this.productRepository.setImagePrimary(remaining[0].id, productId);
      }
    }

    return { message: 'Imagen eliminada correctamente.' };
  }

  async setProductImagePrimary(
    productId: string,
    imageId: string,
    isPrimary = true,
  ) {
    const image = await this.productRepository.findImageById(imageId);
    if (!image || image.productId !== productId) {
      throw new NotFoundException({
        code: 'PRODUCT_IMAGE_NOT_FOUND',
        message: 'Imagen no encontrada.',
      });
    }

    if (!isPrimary) {
      if (!image.isPrimary) {
        return this.mapProductImage(image);
      }

      const updated = await this.productRepository.unsetImagePrimary(
        imageId,
        productId,
      );
      return this.mapProductImage(updated);
    }

    await this.productRepository.clearPrimaryImage(productId, imageId);
    const updated = await this.productRepository.setImagePrimary(imageId, productId);

    return this.mapProductImage(updated);
  }

  async reorderProductImages(productId: string, imageIds: string[]) {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    }

    const existingIds = new Set(product.images.map((entry) => entry.id));
    if (
      imageIds.length !== product.images.length ||
      imageIds.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException({
        code: 'INVALID_IMAGE_ORDER',
        message: 'Debes enviar todos los IDs de imágenes del producto en el orden deseado.',
      });
    }

    await this.productRepository.updateImagesSortOrder(productId, imageIds);

    const images = await this.productRepository.findImagesByProductId(productId);
    return images.map((entry) => this.mapProductImage(entry));
  }

  private presentProduct(product: ProductRecord): ProductRecord {
    const images = product.images.map((image) => ({
      ...image,
      url: this.storageService.getReadableUrl(image.storageKey),
    }));
    const primaryImage = resolveDisplayPrimaryImage(images);

    return {
      ...product,
      images,
      primaryImageUrl: primaryImage?.url ?? null,
    };
  }

  private mapProductImage(image: {
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
  }) {
    return {
      id: image.id,
      productId: image.productId,
      variantId: image.variantId,
      url: this.storageService.getReadableUrl(image.storageKey),
      storageKey: image.storageKey,
      alt: image.alt,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
    };
  }

  private async assertCatalogReferences(
    primaryCategoryId: string,
    brandId?: string,
  ) {
    const category = await this.categoryRepository.findById(primaryCategoryId);
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Categoría principal no encontrada.',
      });
    }

    if (brandId) {
      const brand = await this.brandRepository.findById(brandId);
      if (!brand) {
        throw new NotFoundException({
          code: 'BRAND_NOT_FOUND',
          message: 'Marca no encontrada.',
        });
      }
    }
  }

  private assertVariants(
    productType: ProductType,
    variants: CreateProductVariantDto[],
  ) {
    if (variants.length === 0) {
      throw new BadRequestException({
        code: 'PRODUCT_VARIANTS_REQUIRED',
        message: 'El producto debe tener al menos una variante.',
      });
    }

    if (productType === ProductType.SIMPLE && variants.length !== 1) {
      throw new BadRequestException({
        code: 'SIMPLE_PRODUCT_SINGLE_VARIANT',
        message: 'Un producto simple debe tener exactamente una variante.',
      });
    }

    const defaultVariants = variants.filter((variant) => variant.isDefault);
    if (defaultVariants.length === 0) {
      variants[0]!.isDefault = true;
    } else if (defaultVariants.length > 1) {
      throw new BadRequestException({
        code: 'MULTIPLE_DEFAULT_VARIANTS',
        message: 'Solo una variante puede ser la predeterminada.',
      });
    }
  }

  private async assertUniqueSkus(
    variants: CreateProductVariantDto[],
    excludeProductId?: string,
  ) {
    const seen = new Set<string>();

    for (const variant of variants) {
      const sku = variant.sku.trim().toUpperCase();
      if (seen.has(sku)) {
        throw new ConflictException({
          code: 'DUPLICATE_SKU',
          message: `SKU duplicado en el payload: ${sku}`,
        });
      }
      seen.add(sku);

      const existing = await this.productRepository.skuExists(
        sku,
        excludeProductId,
      );
      if (existing) {
        throw new ConflictException({
          code: 'SKU_ALREADY_EXISTS',
          message: `El SKU ${sku} ya está en uso.`,
        });
      }
    }
  }

  private async validateAttributeValues(
    productValues: Array<{ attributeId: string; value: string }>,
    variants: CreateProductVariantDto[],
    productScope: AttributeScope,
    variantScope: AttributeScope,
  ) {
    const attributeIds = [
      ...productValues.map((entry) => entry.attributeId),
      ...variants.flatMap(
        (variant) => variant.attributeValues?.map((entry) => entry.attributeId) ?? [],
      ),
    ];

    if (attributeIds.length === 0) return;

    const attributes = await this.attributeRepository.findManyByIds(attributeIds);
    const attributeMap = new Map<string, Attribute>(
      attributes.map((entry) => [entry.id, entry]),
    );

    for (const attributeId of attributeIds) {
      if (!attributeMap.has(attributeId)) {
        throw new NotFoundException({
          code: 'ATTRIBUTE_NOT_FOUND',
          message: `Atributo no encontrado: ${attributeId}`,
        });
      }
    }

    for (const entry of productValues) {
      const attribute = attributeMap.get(entry.attributeId)!;
      if (attribute.scope !== productScope) {
        throw new BadRequestException({
          code: 'INVALID_ATTRIBUTE_SCOPE',
          message: `El atributo ${attribute.name} no aplica a nivel de producto.`,
        });
      }
    }

    for (const variant of variants) {
      for (const entry of variant.attributeValues ?? []) {
        const attribute = attributeMap.get(entry.attributeId)!;
        if (attribute.scope !== variantScope) {
          throw new BadRequestException({
            code: 'INVALID_ATTRIBUTE_SCOPE',
            message: `El atributo ${attribute.name} no aplica a nivel de variante.`,
          });
        }
      }
    }
  }

  private normalizeCategoryIds(
    primaryCategoryId: string,
    categoryIds?: string[],
  ) {
    const unique = new Set(categoryIds ?? []);
    unique.delete(primaryCategoryId);
    return Array.from(unique);
  }

  private normalizeVariants(variants: CreateProductVariantDto[]) {
    return variants.map((variant, index) => ({
      id: variant.id,
      sku: variant.sku.trim().toUpperCase(),
      barcode: variant.barcode?.trim(),
      name: variant.name?.trim(),
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      cost: variant.cost,
      weight: variant.weight,
      isDefault: variant.isDefault ?? index === 0,
      isActive: variant.isActive ?? true,
      sortOrder: variant.sortOrder ?? index,
      attributeValues: variant.attributeValues ?? [],
    }));
  }
}
