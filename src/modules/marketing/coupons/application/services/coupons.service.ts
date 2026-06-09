import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponType } from '../../../../../generated/prisma/client';
import { buildPaginationMeta } from '../../../../../shared/helpers/pagination.helper';
import { PaginationQueryDto } from '../../../../../shared/dto/pagination-query.dto';
import { PrismaCouponRepository } from '../../infrastructure/repositories/prisma-coupon.repository';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly couponRepository: PrismaCouponRepository) {}

  async getStats() {
    const [total, active, inactive] = await Promise.all([
      this.couponRepository.count(),
      this.couponRepository.count({ isActive: true }),
      this.couponRepository.count({ isActive: false }),
    ]);

    return { total, active, inactive };
  }

  async listCoupons(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { items, total } = await this.couponRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((coupon) => this.mapCoupon(coupon)),
      total,
    );
  }

  async getCoupon(id: string) {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: 'Cupón no encontrado.',
      });
    }
    return this.mapCoupon(coupon);
  }

  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.couponRepository.findByCode(code);
    if (existing) {
      throw new ConflictException({
        code: 'COUPON_CODE_EXISTS',
        message: 'Ya existe un cupón con ese código.',
      });
    }

    this.assertCouponValue(dto.type, dto.value);

    const coupon = await this.couponRepository.create({
      code,
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.minOrderAmount ?? null,
      maxUses: dto.maxUses ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
    });

    return this.mapCoupon(coupon);
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const existing = await this.couponRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: 'Cupón no encontrado.',
      });
    }

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const duplicate = await this.couponRepository.findByCode(code);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException({
          code: 'COUPON_CODE_EXISTS',
          message: 'Ya existe un cupón con ese código.',
        });
      }
    }

    const nextType = dto.type ?? existing.type;
    const nextValue = dto.value ?? Number(existing.value);
    this.assertCouponValue(nextType, nextValue);

    const coupon = await this.couponRepository.update(id, {
      code: dto.code ? dto.code.trim().toUpperCase() : undefined,
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.minOrderAmount,
      maxUses: dto.maxUses,
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

    return this.mapCoupon(coupon);
  }

  async resolveDiscount(code: string, subtotal: number) {
    const coupon = await this.couponRepository.findByCode(code);
    if (!coupon) {
      throw new BadRequestException({
        code: 'COUPON_NOT_FOUND',
        message: 'Cupón no válido.',
      });
    }

    this.assertCouponUsable(coupon, subtotal);

    const discount =
      coupon.type === CouponType.PERCENT
        ? Math.min(subtotal, subtotal * (Number(coupon.value) / 100))
        : Math.min(subtotal, Number(coupon.value));

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountAmount: Number(discount.toFixed(2)),
    };
  }

  async consumeCoupon(couponId: string) {
    await this.couponRepository.incrementUsedCount(couponId);
  }

  private assertCouponUsable(
    coupon: {
      isActive: boolean;
      startsAt: Date | null;
      expiresAt: Date | null;
      maxUses: number | null;
      usedCount: number;
      minOrderAmount: { toString(): string } | null;
    },
    subtotal: number,
  ) {
    if (!coupon.isActive) {
      throw new BadRequestException({
        code: 'COUPON_INACTIVE',
        message: 'El cupón no está activo.',
      });
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException({
        code: 'COUPON_NOT_STARTED',
        message: 'El cupón aún no está vigente.',
      });
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException({
        code: 'COUPON_EXPIRED',
        message: 'El cupón ha expirado.',
      });
    }

    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException({
        code: 'COUPON_MAX_USES',
        message: 'El cupón alcanzó su límite de usos.',
      });
    }

    const minAmount =
      coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : null;
    if (minAmount != null && subtotal < minAmount) {
      throw new BadRequestException({
        code: 'COUPON_MIN_ORDER',
        message: `El pedido debe ser al menos ${minAmount.toFixed(2)} para usar este cupón.`,
      });
    }
  }

  private assertCouponValue(type: CouponType, value: number) {
    if (type === CouponType.PERCENT && (value <= 0 || value > 100)) {
      throw new BadRequestException({
        code: 'INVALID_COUPON_VALUE',
        message: 'El porcentaje debe estar entre 1 y 100.',
      });
    }
  }

  private mapCoupon(coupon: {
    id: string;
    code: string;
    type: CouponType;
    value: { toString(): string };
    minOrderAmount: { toString(): string } | null;
    maxUses: number | null;
    usedCount: number;
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      minOrderAmount: coupon.minOrderAmount?.toString() ?? null,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      startsAt: coupon.startsAt?.toISOString() ?? null,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }
}
