import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  CreateShippingZoneDto,
  UpdateShippingZoneDto,
} from './shipping-zone.dto';

@Injectable()
export class ShippingZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const zones = await this.prisma.shippingZone.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return zones.map((zone) => this.mapZone(zone));
  }

  async create(dto: CreateShippingZoneDto) {
    const zone = await this.prisma.shippingZone.create({
      data: {
        name: dto.name.trim(),
        department: dto.department?.trim() || null,
        province: dto.province?.trim() || null,
        flatFee: new Prisma.Decimal(dto.flatFee),
        freeShippingMinAmount:
          dto.freeShippingMinAmount != null
            ? new Prisma.Decimal(dto.freeShippingMinAmount)
            : null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.mapZone(zone);
  }

  async update(id: string, dto: UpdateShippingZoneDto) {
    await this.requireZone(id);
    const zone = await this.prisma.shippingZone.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        department:
          dto.department === undefined
            ? undefined
            : dto.department?.trim() || null,
        province:
          dto.province === undefined ? undefined : dto.province?.trim() || null,
        flatFee:
          dto.flatFee != null ? new Prisma.Decimal(dto.flatFee) : undefined,
        freeShippingMinAmount:
          dto.freeShippingMinAmount === undefined
            ? undefined
            : dto.freeShippingMinAmount != null
              ? new Prisma.Decimal(dto.freeShippingMinAmount)
              : null,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
    return this.mapZone(zone);
  }

  async delete(id: string) {
    await this.requireZone(id);
    await this.prisma.shippingZone.delete({ where: { id } });
    return { deleted: true };
  }

  async calculateShippingFee(params: {
    department?: string | null;
    province?: string | null;
    subtotal: number;
    fallbackFee?: number;
  }) {
    const zones = await this.prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }],
    });

    const department = params.department?.trim().toLowerCase();
    const province = params.province?.trim().toLowerCase();

    const matched =
      zones.find(
        (z) =>
          z.department?.toLowerCase() === department &&
          z.province?.toLowerCase() === province,
      ) ??
      zones.find(
        (z) => z.department?.toLowerCase() === department && !z.province,
      ) ??
      zones.find((z) => !z.department && !z.province);

    if (!matched) {
      return {
        fee: params.fallbackFee ?? 0,
        zoneId: null,
        zoneName: null,
        isFreeShipping: false,
      };
    }

    const fee = Number(matched.flatFee);
    const minFree = matched.freeShippingMinAmount
      ? Number(matched.freeShippingMinAmount)
      : null;
    const isFreeShipping = minFree != null && params.subtotal >= minFree;

    return {
      fee: isFreeShipping ? 0 : fee,
      zoneId: matched.id,
      zoneName: matched.name,
      isFreeShipping,
    };
  }

  private async requireZone(id: string) {
    const zone = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundException({
        code: 'SHIPPING_ZONE_NOT_FOUND',
        message: 'Zona de envío no encontrada.',
      });
    }
    return zone;
  }

  private mapZone(zone: {
    id: string;
    name: string;
    department: string | null;
    province: string | null;
    flatFee: Prisma.Decimal;
    freeShippingMinAmount: Prisma.Decimal | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: zone.id,
      name: zone.name,
      department: zone.department,
      province: zone.province,
      flatFee: zone.flatFee.toString(),
      freeShippingMinAmount: zone.freeShippingMinAmount?.toString() ?? null,
      isActive: zone.isActive,
      sortOrder: zone.sortOrder,
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
    };
  }
}
