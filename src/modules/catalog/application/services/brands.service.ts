import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from '../../../../infrastructure/storage/storage.service';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { ensureUniqueSlug } from '../../../../shared/helpers/slug.helper';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import { PrismaBrandRepository } from '../../infrastructure/repositories/prisma-brand.repository';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private readonly brandRepository: PrismaBrandRepository,
    private readonly storageService: StorageService,
  ) {}

  async listBrands(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.brandRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((brand) => this.mapBrand(brand)),
      total,
    );
  }

  async listActiveBrands() {
    const { items } = await this.brandRepository.listPaginated({
      page: 1,
      limit: 500,
    });

    return items
      .filter((brand) => brand.isActive)
      .map((brand) => this.mapBrand(brand));
  }

  async getBrand(id: string) {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException({
        code: 'BRAND_NOT_FOUND',
        message: 'Marca no encontrada.',
      });
    }

    return this.mapBrand(brand);
  }

  async createBrand(dto: CreateBrandDto) {
    const slug = await ensureUniqueSlug(dto.slug ?? dto.name, async (value) =>
      Boolean(await this.brandRepository.findBySlug(value)),
    );

    const brand = await this.brandRepository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim() ?? null,
      website: dto.website ?? null,
      isActive: dto.isActive ?? true,
    });

    return this.mapBrand(brand);
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    const existing = await this.brandRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'BRAND_NOT_FOUND',
        message: 'Marca no encontrada.',
      });
    }

    let slug = existing.slug;
    if (dto.slug || dto.name) {
      slug = await ensureUniqueSlug(
        dto.slug ?? dto.name ?? existing.name,
        async (value) => {
          const found = await this.brandRepository.findBySlug(value);
          return Boolean(found && found.id !== id);
        },
      );
    }

    const brand = await this.brandRepository.update(id, {
      name: dto.name?.trim(),
      slug,
      description:
        dto.description !== undefined ? dto.description?.trim() ?? null : undefined,
      website: dto.website,
      isActive: dto.isActive,
    });

    return this.mapBrand(brand);
  }

  async deleteBrand(id: string) {
    const existing = await this.brandRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'BRAND_NOT_FOUND',
        message: 'Marca no encontrada.',
      });
    }

    const productsCount = await this.brandRepository.countProducts(id);
    if (productsCount > 0) {
      throw new ConflictException({
        code: 'BRAND_HAS_PRODUCTS',
        message: 'No se puede eliminar una marca con productos asociados.',
      });
    }

    if (existing.logoKey) {
      await this.storageService.deleteObject(existing.logoKey);
    }

    await this.brandRepository.delete(id);
    return { message: 'Marca eliminada correctamente.' };
  }

  async uploadBrandLogo(brandId: string, file: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'Debes enviar un archivo de imagen.',
      });
    }

    const brand = await this.brandRepository.findById(brandId);
    if (!brand) {
      throw new NotFoundException({
        code: 'BRAND_NOT_FOUND',
        message: 'Marca no encontrada.',
      });
    }

    if (brand.logoKey) {
      await this.storageService.deleteObject(brand.logoKey);
    }

    const uploaded = await this.storageService.uploadObject({
      folder: `catalog/brands/${brandId}`,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const updated = await this.brandRepository.update(brandId, {
      logoKey: uploaded.storageKey,
      logoUrl: this.storageService.getReadableUrl(uploaded.storageKey),
    });

    return this.mapBrand(updated);
  }

  async deleteBrandLogo(brandId: string) {
    const brand = await this.brandRepository.findById(brandId);
    if (!brand) {
      throw new NotFoundException({
        code: 'BRAND_NOT_FOUND',
        message: 'Marca no encontrada.',
      });
    }

    if (brand.logoKey) {
      await this.storageService.deleteObject(brand.logoKey);
    }

    const updated = await this.brandRepository.update(brandId, {
      logoKey: null,
      logoUrl: null,
    });

    return this.mapBrand(updated);
  }

  private mapBrand(brand: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    logoKey?: string | null;
    website: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logoUrl: brand.logoKey
        ? this.storageService.getReadableUrl(brand.logoKey)
        : brand.logoUrl,
      website: brand.website,
      isActive: brand.isActive,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }
}
