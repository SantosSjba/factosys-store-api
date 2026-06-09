import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import type { WarehouseRecord } from '../../domain/types/inventory.types';
import { PrismaWarehouseRepository } from '../../infrastructure/repositories/prisma-warehouse.repository';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    private readonly warehouseRepository: PrismaWarehouseRepository,
  ) {}

  async listWarehouses(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.warehouseRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapWarehouse(item)),
      total,
    );
  }

  listActiveWarehouses() {
    return this.warehouseRepository
      .listActive()
      .then((items) => items.map((item) => this.mapWarehouse(item)));
  }

  async getWarehouse(id: string) {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Almacén no encontrado.',
      });
    }

    return this.mapWarehouse(warehouse);
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const code = dto.code.trim().toUpperCase();
    if (await this.warehouseRepository.findByCode(code)) {
      throw new ConflictException({
        code: 'WAREHOUSE_CODE_EXISTS',
        message: 'Ya existe un almacén con ese código.',
      });
    }

    if (dto.isDefault) {
      await this.warehouseRepository.clearDefaultFlag();
    }

    const warehouse = await this.warehouseRepository.create({
      name: dto.name.trim(),
      code,
      description: dto.description?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      isDefault: dto.isDefault ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.mapWarehouse(warehouse);
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    const existing = await this.warehouseRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Almacén no encontrado.',
      });
    }

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const duplicate = await this.warehouseRepository.findByCode(code);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException({
          code: 'WAREHOUSE_CODE_EXISTS',
          message: 'Ya existe un almacén con ese código.',
        });
      }
    }

    if (dto.isDefault) {
      await this.warehouseRepository.clearDefaultFlag(id);
    }

    if (dto.isDefault === false && existing.isDefault) {
      const otherDefault = await this.warehouseRepository.findDefault();
      if (!otherDefault || otherDefault.id === id) {
        throw new BadRequestException({
          code: 'WAREHOUSE_DEFAULT_REQUIRED',
          message: 'Debe existir al menos un almacén predeterminado.',
        });
      }
    }

    const warehouse = await this.warehouseRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code !== undefined
        ? { code: dto.code.trim().toUpperCase() }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() || null }
        : {}),
      ...(dto.address !== undefined
        ? { address: dto.address.trim() || null }
        : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    return this.mapWarehouse(warehouse);
  }

  async deleteWarehouse(id: string) {
    const existing = await this.warehouseRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: 'Almacén no encontrado.',
      });
    }

    if (existing.isDefault) {
      throw new BadRequestException({
        code: 'WAREHOUSE_DEFAULT_DELETE',
        message: 'No puedes eliminar el almacén predeterminado.',
      });
    }

    const stockCount = await this.warehouseRepository.countStockLevels(id);
    if (stockCount > 0) {
      throw new BadRequestException({
        code: 'WAREHOUSE_HAS_STOCK',
        message: 'No puedes eliminar un almacén con stock registrado.',
      });
    }

    await this.warehouseRepository.delete(id);
    return { message: 'Almacén eliminado correctamente.' };
  }

  private mapWarehouse(warehouse: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    address: string | null;
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): WarehouseRecord {
    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description,
      address: warehouse.address,
      isDefault: warehouse.isDefault,
      isActive: warehouse.isActive,
      sortOrder: warehouse.sortOrder,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    };
  }
}
