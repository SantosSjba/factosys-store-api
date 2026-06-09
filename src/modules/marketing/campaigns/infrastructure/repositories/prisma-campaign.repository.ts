import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';

@Injectable()
export class PrismaCampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        coupon: true,
        banners: { include: { banner: true } },
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.campaign.findUnique({ where: { slug } });
  }

  async listPaginated(params: { page: number; limit: number; search?: string }) {
    const where: Prisma.CampaignWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { slug: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          coupon: true,
          banners: { include: { banner: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, total };
  }

  create(data: Prisma.CampaignCreateInput) {
    return this.prisma.campaign.create({
      data,
      include: {
        coupon: true,
        banners: { include: { banner: true } },
      },
    });
  }

  update(id: string, data: Prisma.CampaignUpdateInput) {
    return this.prisma.campaign.update({
      where: { id },
      data,
      include: {
        coupon: true,
        banners: { include: { banner: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.campaign.delete({ where: { id } });
  }

  async replaceBanners(campaignId: string, bannerIds: string[]) {
    await this.prisma.campaignBanner.deleteMany({ where: { campaignId } });
    if (!bannerIds.length) return;

    await this.prisma.campaignBanner.createMany({
      data: bannerIds.map((bannerId) => ({ campaignId, bannerId })),
      skipDuplicates: true,
    });
  }
}
