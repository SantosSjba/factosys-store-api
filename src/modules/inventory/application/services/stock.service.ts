import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StockMovementType } from '../../../../generated/prisma/client';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import type {
  StockLevelRecord,
  StockMovementRecord,
} from '../../domain/types/inventory.types';
import { PrismaMovementRepository } from '../../infrastructure/repositories/prisma-movement.repository';
import { PrismaStockRepository } from '../../infrastructure/repositories/prisma-stock.repository';
import { PrismaWarehouseRepository } from '../../infrastructure/repositories/prisma-warehouse.repository';
import {
  ListMovementsQueryDto,
  ListStockQueryDto,
} from '../dto/list-inventory-query.dto';
import {
  CreateStockMovementDto,
  UpdateStockThresholdDto,
} from '../dto/stock-movement.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly stockRepository: PrismaStockRepository,
    private readonly movementRepository: PrismaMovementRepository,
    private readonly warehouseRepository: PrismaWarehouseRepository,
  ) {}

  async listStock(query: ListStockQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const lowStockOnly = query.lowStock === 'true';

    const { items, total } = await this.stockRepository.listPaginated({
      page,
      limit,
      warehouseId: query.warehouseId,
      variantId: query.variantId,
      productId: query.productId,
      search: query.search,
      lowStockOnly,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapStockLevel(item)),
      total,
    );
  }

  async listMovements(query: ListMovementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.movementRepository.listPaginated({
      page,
      limit,
      warehouseId: query.warehouseId,
      variantId: query.variantId,
      type: query.type,
      search: query.search,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapMovement(item)),
      total,
    );
  }

  async updateThreshold(stockLevelId: string, dto: UpdateStockThresholdDto) {
    const level = await this.stockRepository.findById(stockLevelId);
    if (!level) {
      throw new NotFoundException({
        code: 'STOCK_LEVEL_NOT_FOUND',
        message: 'Registro de stock no encontrado.',
      });
    }

    const updated = await this.stockRepository.update(stockLevelId, {
      lowStockThreshold: dto.lowStockThreshold,
    });

    return this.mapStockLevel(updated);
  }

  lookupVariants(search: string) {
    const term = search.trim();
    if (term.length < 2) {
      return [];
    }

    return this.stockRepository.searchVariants(term).then((items) =>
      items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        productId: item.productId,
        productName: item.product.name,
      })),
    );
  }

  async createMovement(dto: CreateStockMovementDto, performedById?: string) {
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

    if (dto.type === StockMovementType.TRANSFER) {
      if (!dto.targetWarehouseId) {
        throw new BadRequestException({
          code: 'TRANSFER_TARGET_REQUIRED',
          message: 'Selecciona el almacén destino para la transferencia.',
        });
      }
      if (dto.targetWarehouseId === dto.warehouseId) {
        throw new BadRequestException({
          code: 'TRANSFER_SAME_WAREHOUSE',
          message: 'El almacén destino debe ser diferente al origen.',
        });
      }
    }

    const quantityChange = this.resolveQuantityChange(dto.type, dto.quantity);
    if (quantityChange === 0) {
      throw new BadRequestException({
        code: 'INVALID_QUANTITY',
        message: 'La cantidad debe ser distinta de cero.',
      });
    }

    if (dto.type === StockMovementType.TRANSFER) {
      const target = await this.warehouseRepository.findById(
        dto.targetWarehouseId!,
      );
      if (!target || !target.isActive) {
        throw new NotFoundException({
          code: 'TARGET_WAREHOUSE_NOT_FOUND',
          message: 'Almacén destino no encontrado o inactivo.',
        });
      }
    }

    const movement = await this.movementRepository.runStockTransaction(
      async (tx) => {
        const sourceLevel = await this.movementRepository.getLevelInTransaction(
          tx,
          dto.warehouseId,
          dto.variantId,
        );
        const quantityBefore = sourceLevel?.quantityOnHand ?? 0;
        const quantityReserved = sourceLevel?.quantityReserved ?? 0;
        const quantityAfter = quantityBefore + quantityChange;

        if (quantityAfter < 0) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_STOCK',
            message: 'Stock insuficiente para completar el movimiento.',
          });
        }

        if (quantityAfter < quantityReserved) {
          throw new BadRequestException({
            code: 'STOCK_BELOW_RESERVED',
            message: `No puedes dejar el stock por debajo de lo reservado (${quantityReserved} unidades).`,
          });
        }

        await this.movementRepository.upsertLevelInTransaction(
          tx,
          dto.warehouseId,
          dto.variantId,
          quantityAfter,
        );

        if (dto.type === StockMovementType.TRANSFER) {
          const targetLevel =
            await this.movementRepository.getLevelInTransaction(
              tx,
              dto.targetWarehouseId!,
              dto.variantId,
            );
          const targetBefore = targetLevel?.quantityOnHand ?? 0;
          const transferQty = Math.abs(quantityChange);

          await this.movementRepository.upsertLevelInTransaction(
            tx,
            dto.targetWarehouseId!,
            dto.variantId,
            targetBefore + transferQty,
          );
        }

        return this.movementRepository.createMovementInTransaction(tx, {
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          type: dto.type,
          quantityChange,
          quantityBefore,
          quantityAfter,
          note: dto.note?.trim() ?? null,
          performedById: performedById ?? null,
          targetWarehouseId:
            dto.type === StockMovementType.TRANSFER
              ? dto.targetWarehouseId!
              : null,
        });
      },
    );

    return this.mapMovement(movement);
  }

  private resolveQuantityChange(
    type: StockMovementType,
    quantity: number,
  ): number {
    if (type === StockMovementType.ADJUSTMENT) {
      return quantity;
    }

    if (quantity <= 0) {
      throw new BadRequestException({
        code: 'INVALID_QUANTITY',
        message: 'La cantidad debe ser mayor a cero.',
      });
    }

    if (type === StockMovementType.RECEIPT) {
      return quantity;
    }

    return -quantity;
  }

  private mapStockLevel(level: {
    id: string;
    warehouseId: string;
    variantId: string;
    quantityOnHand: number;
    quantityReserved: number;
    lowStockThreshold: number | null;
    updatedAt: Date;
    warehouse: { name: string; code: string };
    variant: {
      sku: string;
      name: string | null;
      productId: string;
      product: { name: string };
    };
  }): StockLevelRecord {
    const quantityAvailable = level.quantityOnHand - level.quantityReserved;
    const isLowStock =
      level.lowStockThreshold != null &&
      quantityAvailable <= level.lowStockThreshold;

    return {
      id: level.id,
      warehouseId: level.warehouseId,
      warehouseName: level.warehouse.name,
      warehouseCode: level.warehouse.code,
      variantId: level.variantId,
      sku: level.variant.sku,
      variantName: level.variant.name,
      productId: level.variant.productId,
      productName: level.variant.product.name,
      quantityOnHand: level.quantityOnHand,
      quantityReserved: level.quantityReserved,
      quantityAvailable,
      lowStockThreshold: level.lowStockThreshold,
      isLowStock,
      updatedAt: level.updatedAt,
    };
  }

  private mapMovement(movement: {
    id: string;
    warehouseId: string;
    variantId: string;
    type: StockMovementType;
    quantityChange: number;
    quantityBefore: number;
    quantityAfter: number;
    note: string | null;
    performedById: string | null;
    targetWarehouseId: string | null;
    createdAt: Date;
    warehouse: { name: string };
    targetWarehouse: { name: string } | null;
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
  }): StockMovementRecord {
    const performedByName = movement.performedBy
      ? [movement.performedBy.firstName, movement.performedBy.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || movement.performedBy.email
      : null;

    return {
      id: movement.id,
      warehouseId: movement.warehouseId,
      warehouseName: movement.warehouse.name,
      variantId: movement.variantId,
      sku: movement.variant.sku,
      variantName: movement.variant.name,
      productName: movement.variant.product.name,
      type: movement.type,
      quantityChange: movement.quantityChange,
      quantityBefore: movement.quantityBefore,
      quantityAfter: movement.quantityAfter,
      note: movement.note,
      performedById: movement.performedById,
      performedByName,
      targetWarehouseId: movement.targetWarehouseId,
      targetWarehouseName: movement.targetWarehouse?.name ?? null,
      createdAt: movement.createdAt,
    };
  }
}
