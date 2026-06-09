import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../../../shared/dto/pagination-query.dto';
import { buildPaginationMeta } from '../../../../../shared/helpers/pagination.helper';
import { PrismaCampaignRepository } from '../../infrastructure/repositories/prisma-campaign.repository';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly campaignRepository: PrismaCampaignRepository) {}

  async listCampaigns(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { items, total } = await this.campaignRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((campaign) => this.mapCampaign(campaign)),
      total,
    );
  }

  async getCampaign(id: string) {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) {
      throw new NotFoundException({
        code: 'CAMPAIGN_NOT_FOUND',
        message: 'Campaña no encontrada.',
      });
    }
    return this.mapCampaign(campaign);
  }

  async createCampaign(dto: CreateCampaignDto) {
    const slug = this.resolveSlug(dto.slug ?? dto.name);
    const existing = await this.campaignRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException({
        code: 'CAMPAIGN_SLUG_EXISTS',
        message: 'Ya existe una campaña con ese slug.',
      });
    }

    const campaign = await this.campaignRepository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description?.trim() ?? null,
      coupon: dto.couponId ? { connect: { id: dto.couponId } } : undefined,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
    });

    if (dto.bannerIds?.length) {
      await this.campaignRepository.replaceBanners(campaign.id, dto.bannerIds);
    }

    return this.getCampaign(campaign.id);
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    await this.getCampaign(id);

    if (dto.slug) {
      const slug = this.resolveSlug(dto.slug);
      const duplicate = await this.campaignRepository.findBySlug(slug);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException({
          code: 'CAMPAIGN_SLUG_EXISTS',
          message: 'Ya existe una campaña con ese slug.',
        });
      }
    }

    await this.campaignRepository.update(id, {
      name: dto.name?.trim(),
      slug: dto.slug ? this.resolveSlug(dto.slug) : undefined,
      description:
        dto.description === undefined ? undefined : dto.description?.trim() ?? null,
      coupon:
        dto.couponId === undefined
          ? undefined
          : dto.couponId
            ? { connect: { id: dto.couponId } }
            : { disconnect: true },
      startsAt:
        dto.startsAt === undefined ? undefined : dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt:
        dto.expiresAt === undefined ? undefined : dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive,
    });

    if (dto.bannerIds) {
      await this.campaignRepository.replaceBanners(id, dto.bannerIds);
    }

    return this.getCampaign(id);
  }

  async deleteCampaign(id: string) {
    await this.getCampaign(id);
    await this.campaignRepository.delete(id);
    return { message: 'Campaña eliminada correctamente.' };
  }

  private resolveSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private mapCampaign(campaign: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    couponId: string | null;
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    coupon: { id: string; code: string } | null;
    banners: Array<{
      banner: {
        id: string;
        title: string;
        imageUrl: string | null;
        placement: string;
      };
    }>;
  }) {
    return {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      couponId: campaign.couponId,
      couponCode: campaign.coupon?.code ?? null,
      bannerIds: campaign.banners.map((row) => row.banner.id),
      banners: campaign.banners.map((row) => ({
        id: row.banner.id,
        title: row.banner.title,
        imageUrl: row.banner.imageUrl,
        placement: row.banner.placement,
      })),
      startsAt: campaign.startsAt?.toISOString() ?? null,
      expiresAt: campaign.expiresAt?.toISOString() ?? null,
      isActive: campaign.isActive,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }
}
