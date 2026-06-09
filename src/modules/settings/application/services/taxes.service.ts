import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import type { TaxRateRecord } from '../../domain/types/settings.types';
import { PrismaTaxRepository } from '../../infrastructure/repositories/prisma-tax.repository';
import { CreateTaxRateDto, UpdateTaxRateDto } from '../dto/tax.dto';

@Injectable()
export class TaxesService {
  constructor(private readonly taxRepository: PrismaTaxRepository) {}

  async listTaxRates(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.taxRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapTaxRate(item)),
      total,
    );
  }

  listActiveTaxRates() {
    return this.taxRepository
      .listActive()
      .then((items) => items.map((item) => this.mapTaxRate(item)));
  }

  async getTaxRate(id: string) {
    const tax = await this.taxRepository.findById(id);
    if (!tax) {
      throw new NotFoundException({
        code: 'TAX_RATE_NOT_FOUND',
        message: 'Impuesto no encontrado.',
      });
    }

    return this.mapTaxRate(tax);
  }

  async createTaxRate(dto: CreateTaxRateDto) {
    if (dto.isDefault) {
      await this.taxRepository.clearDefaultFlag();
    }

    const tax = await this.taxRepository.create({
      name: dto.name.trim(),
      code: dto.code?.trim() ?? null,
      rate: dto.rate,
      isDefault: dto.isDefault ?? false,
      isActive: dto.isActive ?? true,
      appliesToShipping: dto.appliesToShipping ?? false,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.mapTaxRate(tax);
  }

  async updateTaxRate(id: string, dto: UpdateTaxRateDto) {
    const existing = await this.taxRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'TAX_RATE_NOT_FOUND',
        message: 'Impuesto no encontrado.',
      });
    }

    if (dto.isDefault) {
      await this.taxRepository.clearDefaultFlag();
    }

    const tax = await this.taxRepository.update(id, {
      name: dto.name?.trim(),
      code: dto.code !== undefined ? (dto.code?.trim() ?? null) : undefined,
      rate: dto.rate,
      isDefault: dto.isDefault,
      isActive: dto.isActive,
      appliesToShipping: dto.appliesToShipping,
      sortOrder: dto.sortOrder,
    });

    return this.mapTaxRate(tax);
  }

  async deleteTaxRate(id: string) {
    const existing = await this.taxRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'TAX_RATE_NOT_FOUND',
        message: 'Impuesto no encontrado.',
      });
    }

    if (existing.isDefault) {
      throw new ConflictException({
        code: 'TAX_RATE_IS_DEFAULT',
        message: 'No puedes eliminar el impuesto predeterminado.',
      });
    }

    await this.taxRepository.delete(id);
    return { message: 'Impuesto eliminado correctamente.' };
  }

  private mapTaxRate(tax: {
    id: string;
    name: string;
    code: string | null;
    rate: { toString(): string };
    isDefault: boolean;
    isActive: boolean;
    appliesToShipping: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): TaxRateRecord {
    return {
      id: tax.id,
      name: tax.name,
      code: tax.code,
      rate: tax.rate.toString(),
      isDefault: tax.isDefault,
      isActive: tax.isActive,
      appliesToShipping: tax.appliesToShipping,
      sortOrder: tax.sortOrder,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    };
  }
}
