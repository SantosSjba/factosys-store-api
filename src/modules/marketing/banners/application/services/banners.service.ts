import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BannerPlacement } from '../../../../../generated/prisma/client';
import { StorageService } from '../../../../../infrastructure/storage/storage.service';
import type { UploadedImageFile } from '../../../../../shared/types/uploaded-file.type';
import { PaginationQueryDto } from '../../../../../shared/dto/pagination-query.dto';
import { buildPaginationMeta } from '../../../../../shared/helpers/pagination.helper';
import { PrismaBannerRepository } from '../../infrastructure/repositories/prisma-banner.repository';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    private readonly bannerRepository: PrismaBannerRepository,
    private readonly storageService: StorageService,
  ) {}

  async listPublicBanners(
    placement: BannerPlacement = BannerPlacement.HOME_HERO,
  ) {
    const banners =
      await this.bannerRepository.listActiveByPlacement(placement);

    return banners.map((banner) => this.mapPublicBanner(banner));
  }

  async listBanners(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { items, total } = await this.bannerRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((banner) => this.mapBanner(banner)),
      total,
    );
  }

  async getBanner(id: string) {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundException({
        code: 'BANNER_NOT_FOUND',
        message: 'Banner no encontrado.',
      });
    }
    return this.mapBanner(banner);
  }

  async createBanner(dto: CreateBannerDto) {
    const banner = await this.bannerRepository.create({
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() ?? null,
      linkUrl: dto.linkUrl?.trim() ?? null,
      placement: dto.placement ?? BannerPlacement.HOME_HERO,
      sortOrder: dto.sortOrder ?? 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
    });

    return this.mapBanner(banner);
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    await this.getBanner(id);

    const banner = await this.bannerRepository.update(id, {
      title: dto.title?.trim(),
      subtitle:
        dto.subtitle === undefined ? undefined : (dto.subtitle?.trim() ?? null),
      linkUrl:
        dto.linkUrl === undefined ? undefined : (dto.linkUrl?.trim() ?? null),
      placement: dto.placement,
      sortOrder: dto.sortOrder,
      startsAt:
        dto.startsAt === undefined
          ? undefined
          : dto.startsAt
            ? new Date(dto.startsAt)
            : null,
      expiresAt:
        dto.expiresAt === undefined
          ? undefined
          : dto.expiresAt
            ? new Date(dto.expiresAt)
            : null,
      isActive: dto.isActive,
    });

    return this.mapBanner(banner);
  }

  async deleteBanner(id: string) {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundException({
        code: 'BANNER_NOT_FOUND',
        message: 'Banner no encontrado.',
      });
    }

    if (banner.imageKey) {
      await this.storageService.deleteObject(banner.imageKey);
    }

    await this.bannerRepository.delete(id);
    return { message: 'Banner eliminado correctamente.' };
  }

  async uploadBannerImage(id: string, file: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'Debes enviar un archivo de imagen.',
      });
    }

    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundException({
        code: 'BANNER_NOT_FOUND',
        message: 'Banner no encontrado.',
      });
    }

    if (banner.imageKey) {
      await this.storageService.deleteObject(banner.imageKey);
    }

    const uploaded = await this.storageService.uploadObject({
      folder: `marketing/banners/${id}`,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const updated = await this.bannerRepository.update(id, {
      imageKey: uploaded.storageKey,
      imageUrl: this.storageService.getReadableUrl(uploaded.storageKey),
    });

    return this.mapBanner(updated);
  }

  private mapPublicBanner(banner: {
    id: string;
    title: string;
    subtitle: string | null;
    imageKey: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    placement: BannerPlacement;
    sortOrder: number;
  }) {
    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageKey
        ? this.storageService.getReadableUrl(banner.imageKey)
        : banner.imageUrl,
      linkUrl: banner.linkUrl,
      placement: banner.placement,
      sortOrder: banner.sortOrder,
    };
  }

  private mapBanner(banner: {
    id: string;
    title: string;
    subtitle: string | null;
    imageKey: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    placement: BannerPlacement;
    sortOrder: number;
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      imageKey: banner.imageKey,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      placement: banner.placement,
      sortOrder: banner.sortOrder,
      startsAt: banner.startsAt?.toISOString() ?? null,
      expiresAt: banner.expiresAt?.toISOString() ?? null,
      isActive: banner.isActive,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
    };
  }
}
