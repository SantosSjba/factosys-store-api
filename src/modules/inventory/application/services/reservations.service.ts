import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StockReservationStatus } from '../../../../generated/prisma/client';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import type { StockReservationRecord } from '../../domain/types/inventory.types';
import { PrismaReservationRepository } from '../../infrastructure/repositories/prisma-reservation.repository';
import { PrismaStockRepository } from '../../infrastructure/repositories/prisma-stock.repository';
import { PrismaWarehouseRepository } from '../../infrastructure/repositories/prisma-warehouse.repository';
import {
  CreateStockReservationDto,
  ListReservationsQueryDto,
} from '../dto/stock-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationRepository: PrismaReservationRepository,
    private readonly stockRepository: PrismaStockRepository,
    private readonly warehouseRepository: PrismaWarehouseRepository,
  ) {}

  async listReservations(query: ListReservationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.reservationRepository.listPaginated({
      page,
      limit,
      status: query.status ?? StockReservationStatus.ACTIVE,
      warehouseId: query.warehouseId,
      variantId: query.variantId,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapReservation(item)),
      total,
    );
  }

  async createReservation(
    dto: CreateStockReservationDto,
    performedById?: string,
  ) {
    const warehouse = await this.warehouseRepository.findById(dto.warehouseId);
    if (!warehouse || !warehouse.isActive) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Almacén no encontrado o inactivo.',
      });
    }

    const variant = await this.stockRepository.findVariantById(dto.variantId);
    if (!variant || !variant.isActive) {
      throw new NotFoundException({
        code: 'VARIANT_NOT_FOUND',
        message: 'Variante no encontrada o inactiva.',
      });
    }

    const reservation = await this.reservationRepository.runTransaction(
      async (tx) => {
        const level = await this.reservationRepository.getLevelInTransaction(
          tx,
          dto.warehouseId,
          dto.variantId,
        );

        const onHand = level?.quantityOnHand ?? 0;
        const reserved = level?.quantityReserved ?? 0;
        const available = onHand - reserved;

        if (dto.quantity > available) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_AVAILABLE_STOCK',
            message: `Stock disponible insuficiente. Disponible: ${available}.`,
          });
        }

        if (!level) {
          throw new BadRequestException({
            code: 'NO_STOCK_LEVEL',
            message:
              'No hay stock registrado para esta variante en el almacén.',
          });
        }

        await this.reservationRepository.updateReservedInTransaction(
          tx,
          dto.warehouseId,
          dto.variantId,
          reserved + dto.quantity,
        );

        return this.reservationRepository.createInTransaction(tx, {
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          reference: dto.reference?.trim() ?? null,
          note: dto.note?.trim() ?? null,
          performedById: performedById ?? null,
        });
      },
    );

    return this.mapReservation(reservation);
  }

  async releaseReservation(id: string) {
    const existing = await this.reservationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RESERVATION_NOT_FOUND',
        message: 'Reserva no encontrada.',
      });
    }

    if (existing.status !== StockReservationStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'RESERVATION_NOT_ACTIVE',
        message: 'La reserva ya fue liberada.',
      });
    }

    const reservation = await this.reservationRepository.runTransaction(
      async (tx) => {
        const level = await this.reservationRepository.getLevelInTransaction(
          tx,
          existing.warehouseId,
          existing.variantId,
        );

        if (level) {
          const nextReserved = Math.max(
            0,
            level.quantityReserved - existing.quantity,
          );
          await this.reservationRepository.updateReservedInTransaction(
            tx,
            existing.warehouseId,
            existing.variantId,
            nextReserved,
          );
        }

        return this.reservationRepository.releaseInTransaction(tx, id);
      },
    );

    return this.mapReservation(reservation);
  }

  private mapReservation(reservation: {
    id: string;
    warehouseId: string;
    variantId: string;
    quantity: number;
    reference: string | null;
    note: string | null;
    status: StockReservationStatus;
    performedById: string | null;
    createdAt: Date;
    releasedAt: Date | null;
    warehouse: { name: string; code: string };
    variant: {
      sku: string;
      name: string | null;
      product: { name: string };
    };
    performedBy: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  }): StockReservationRecord {
    const performedByName = reservation.performedBy
      ? [reservation.performedBy.firstName, reservation.performedBy.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || reservation.performedBy.email
      : null;

    return {
      id: reservation.id,
      warehouseId: reservation.warehouseId,
      warehouseName: reservation.warehouse.name,
      warehouseCode: reservation.warehouse.code,
      variantId: reservation.variantId,
      sku: reservation.variant.sku,
      variantName: reservation.variant.name,
      productName: reservation.variant.product.name,
      quantity: reservation.quantity,
      reference: reservation.reference,
      note: reservation.note,
      status: reservation.status,
      performedById: reservation.performedById,
      performedByName,
      createdAt: reservation.createdAt,
      releasedAt: reservation.releasedAt,
    };
  }
}
