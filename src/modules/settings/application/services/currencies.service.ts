import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../../../../shared/helpers/pagination.helper';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';
import type { CurrencyRecord } from '../../domain/types/settings.types';
import { PrismaCurrencyRepository } from '../../infrastructure/repositories/prisma-currency.repository';
import { CreateCurrencyDto, UpdateCurrencyDto } from '../dto/currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(private readonly currencyRepository: PrismaCurrencyRepository) {}

  async listCurrencies(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.currencyRepository.listPaginated({
      page,
      limit,
      search: query.search,
    });

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapCurrency(item)),
      total,
    );
  }

  listActiveCurrencies() {
    return this.currencyRepository
      .listActive()
      .then((items) => items.map((item) => this.mapCurrency(item)));
  }

  async getCurrency(id: string) {
    const currency = await this.currencyRepository.findById(id);
    if (!currency) {
      throw new NotFoundException({
        code: 'CURRENCY_NOT_FOUND',
        message: 'Moneda no encontrada.',
      });
    }

    return this.mapCurrency(currency);
  }

  async createCurrency(dto: CreateCurrencyDto) {
    const code = dto.code.trim().toUpperCase();
    if (await this.currencyRepository.findByCode(code)) {
      throw new ConflictException({
        code: 'CURRENCY_CODE_EXISTS',
        message: 'Ya existe una moneda con ese código.',
      });
    }

    if (dto.isDefault) {
      await this.currencyRepository.clearDefaultFlag();
    }

    const currency = await this.currencyRepository.create({
      code,
      name: dto.name.trim(),
      symbol: dto.symbol.trim(),
      exchangeRate: dto.exchangeRate ?? 1,
      decimalPlaces: dto.decimalPlaces ?? 2,
      isDefault: dto.isDefault ?? false,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.mapCurrency(currency);
  }

  async updateCurrency(id: string, dto: UpdateCurrencyDto) {
    const existing = await this.currencyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'CURRENCY_NOT_FOUND',
        message: 'Moneda no encontrada.',
      });
    }

    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const found = await this.currencyRepository.findByCode(code);
      if (found && found.id !== id) {
        throw new ConflictException({
          code: 'CURRENCY_CODE_EXISTS',
          message: 'Ya existe una moneda con ese código.',
        });
      }
    }

    if (dto.isDefault) {
      await this.currencyRepository.clearDefaultFlag();
    }

    const currency = await this.currencyRepository.update(id, {
      code: dto.code?.trim().toUpperCase(),
      name: dto.name?.trim(),
      symbol: dto.symbol?.trim(),
      exchangeRate: dto.exchangeRate,
      decimalPlaces: dto.decimalPlaces,
      isDefault: dto.isDefault,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    });

    return this.mapCurrency(currency);
  }

  async deleteCurrency(id: string) {
    const existing = await this.currencyRepository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'CURRENCY_NOT_FOUND',
        message: 'Moneda no encontrada.',
      });
    }

    if (existing.isDefault) {
      throw new ConflictException({
        code: 'CURRENCY_IS_DEFAULT',
        message: 'No puedes eliminar la moneda predeterminada.',
      });
    }

    await this.currencyRepository.delete(id);
    return { message: 'Moneda eliminada correctamente.' };
  }

  private mapCurrency(currency: {
    id: string;
    code: string;
    name: string;
    symbol: string;
    exchangeRate: { toString(): string };
    decimalPlaces: number;
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): CurrencyRecord {
    return {
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate.toString(),
      decimalPlaces: currency.decimalPlaces,
      isDefault: currency.isDefault,
      isActive: currency.isActive,
      sortOrder: currency.sortOrder,
      createdAt: currency.createdAt,
      updatedAt: currency.updatedAt,
    };
  }
}
