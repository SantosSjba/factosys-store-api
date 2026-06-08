import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { StorageService } from '../../../../infrastructure/storage/storage.service';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import type {
  PublicStoreSettingsRecord,
  StoreSettingsRecord,
} from '../../domain/types/settings.types';
import { PrismaCompanyRepository } from '../../infrastructure/repositories/prisma-company.repository';
import { PrismaCurrencyRepository } from '../../infrastructure/repositories/prisma-currency.repository';
import { PrismaStoreSettingsRepository } from '../../infrastructure/repositories/prisma-store-settings.repository';
import { PrismaTaxRepository } from '../../infrastructure/repositories/prisma-tax.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UpdateStoreSettingsDto } from '../dto/store-settings.dto';

@Injectable()
export class StoreSettingsService {
  constructor(
    private readonly storeSettingsRepository: PrismaStoreSettingsRepository,
    private readonly companyRepository: PrismaCompanyRepository,
    private readonly currencyRepository: PrismaCurrencyRepository,
    private readonly taxRepository: PrismaTaxRepository,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getStoreSettings() {
    const settings = await this.storeSettingsRepository.getOrCreate();
    return this.mapStoreSettings(settings);
  }

  async updateStoreSettings(dto: UpdateStoreSettingsDto) {
    if (dto.defaultTaxRateId) {
      const tax = await this.taxRepository.findById(dto.defaultTaxRateId);
      if (!tax) {
        throw new NotFoundException({
          code: 'TAX_RATE_NOT_FOUND',
          message: 'Impuesto no encontrado.',
        });
      }
    }

    if (dto.defaultWarehouseId) {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: dto.defaultWarehouseId },
      });
      if (!warehouse) {
        throw new NotFoundException({
          code: 'WAREHOUSE_NOT_FOUND',
          message: 'Almacén no encontrado.',
        });
      }
    }

    if (dto.defaultCurrencyCode) {
      const currency = await this.currencyRepository.findByCode(
        dto.defaultCurrencyCode.toUpperCase(),
      );
      if (!currency || !currency.isActive) {
        throw new NotFoundException({
          code: 'CURRENCY_NOT_FOUND',
          message: 'Moneda no encontrada o inactiva.',
        });
      }
    }

    const data: Prisma.StoreSettingsUpdateInput = {
      storeName: dto.storeName?.trim(),
      storeTagline: dto.storeTagline !== undefined ? dto.storeTagline?.trim() ?? null : undefined,
      defaultLocale: dto.defaultLocale?.trim(),
      timezone: dto.timezone?.trim(),
      defaultCurrencyCode: dto.defaultCurrencyCode?.trim().toUpperCase(),
      pricesIncludeTax: dto.pricesIncludeTax,
      metaTitleDefault: dto.metaTitleDefault !== undefined ? dto.metaTitleDefault?.trim() ?? null : undefined,
      metaDescriptionDefault:
        dto.metaDescriptionDefault !== undefined
          ? dto.metaDescriptionDefault?.trim() ?? null
          : undefined,
      maintenanceMode: dto.maintenanceMode,
      maintenanceMessage:
        dto.maintenanceMessage !== undefined ? dto.maintenanceMessage?.trim() ?? null : undefined,
      guestCheckoutEnabled: dto.guestCheckoutEnabled,
      minOrderAmount: dto.minOrderAmount,
      orderNumberPrefix: dto.orderNumberPrefix?.trim(),
      lowStockGlobalThreshold: dto.lowStockGlobalThreshold,
      freeShippingMinAmount: dto.freeShippingMinAmount,
      handlingDaysMin: dto.handlingDaysMin,
      handlingDaysMax: dto.handlingDaysMax,
      warrantyPolicyUrl: dto.warrantyPolicyUrl !== undefined ? dto.warrantyPolicyUrl?.trim() ?? null : undefined,
      returnsPolicyUrl: dto.returnsPolicyUrl !== undefined ? dto.returnsPolicyUrl?.trim() ?? null : undefined,
      privacyPolicyUrl: dto.privacyPolicyUrl !== undefined ? dto.privacyPolicyUrl?.trim() ?? null : undefined,
      termsUrl: dto.termsUrl !== undefined ? dto.termsUrl?.trim() ?? null : undefined,
      complaintsBookUrl:
        dto.complaintsBookUrl !== undefined ? dto.complaintsBookUrl?.trim() ?? null : undefined,
      serialNumberRequired: dto.serialNumberRequired,
      orderConfirmationEmailEnabled: dto.orderConfirmationEmailEnabled,
      mailFromName: dto.mailFromName !== undefined ? dto.mailFromName?.trim() ?? null : undefined,
    };

    if (dto.defaultTaxRateId !== undefined) {
      data.defaultTaxRate = dto.defaultTaxRateId
        ? { connect: { id: dto.defaultTaxRateId } }
        : { disconnect: true };
    }

    if (dto.defaultWarehouseId !== undefined) {
      data.defaultWarehouse = dto.defaultWarehouseId
        ? { connect: { id: dto.defaultWarehouseId } }
        : { disconnect: true };
    }

    const settings = await this.storeSettingsRepository.update(data);

    return this.mapStoreSettings(settings);
  }

  async uploadLogo(file: UploadedImageFile) {
    return this.uploadAsset(file, 'logo', 'settings/store/logo');
  }

  async deleteLogo() {
    return this.deleteAsset('logo');
  }

  async uploadFavicon(file: UploadedImageFile) {
    return this.uploadAsset(file, 'favicon', 'settings/store/favicon');
  }

  async deleteFavicon() {
    return this.deleteAsset('favicon');
  }

  async getPublicSettings(): Promise<PublicStoreSettingsRecord> {
    const [settings, company] = await Promise.all([
      this.storeSettingsRepository.getOrCreate(),
      this.companyRepository.getOrCreate(),
    ]);

    const currency =
      (await this.currencyRepository.findByCode(settings.defaultCurrencyCode)) ??
      (await this.currencyRepository.findDefault());

    const tax = settings.defaultTaxRateId
      ? await this.taxRepository.findById(settings.defaultTaxRateId)
      : await this.taxRepository.findDefault();

    return {
      storeName: settings.storeName,
      storeTagline: settings.storeTagline,
      logoUrl: settings.logoKey
        ? this.storageService.getReadableUrl(settings.logoKey)
        : settings.logoUrl,
      faviconUrl: settings.faviconKey
        ? this.storageService.getReadableUrl(settings.faviconKey)
        : settings.faviconUrl,
      defaultLocale: settings.defaultLocale,
      timezone: settings.timezone,
      currency: {
        code: currency?.code ?? settings.defaultCurrencyCode,
        symbol: currency?.symbol ?? 'S/',
        decimalPlaces: currency?.decimalPlaces ?? 2,
      },
      tax: tax
        ? {
            name: tax.name,
            rate: tax.rate.toString(),
            pricesIncludeTax: settings.pricesIncludeTax,
          }
        : null,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      guestCheckoutEnabled: settings.guestCheckoutEnabled,
      minOrderAmount: this.decimalToString(settings.minOrderAmount),
      freeShippingMinAmount: this.decimalToString(settings.freeShippingMinAmount),
      handlingDaysMin: settings.handlingDaysMin,
      handlingDaysMax: settings.handlingDaysMax,
      warrantyPolicyUrl: settings.warrantyPolicyUrl,
      returnsPolicyUrl: settings.returnsPolicyUrl,
      privacyPolicyUrl: settings.privacyPolicyUrl,
      termsUrl: settings.termsUrl,
      complaintsBookUrl: settings.complaintsBookUrl,
      company: {
        tradeName: company.tradeName,
        supportEmail: company.supportEmail,
        supportPhone: company.supportPhone,
        whatsapp: company.whatsapp,
        website: company.website,
      },
    };
  }

  private async uploadAsset(
    file: UploadedImageFile,
    field: 'logo' | 'favicon',
    folder: string,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'Debes enviar un archivo de imagen.',
      });
    }

    const existing = await this.storeSettingsRepository.getOrCreate();
    const keyField = field === 'logo' ? 'logoKey' : 'faviconKey';
    const urlField = field === 'logo' ? 'logoUrl' : 'faviconUrl';
    const existingKey = existing[keyField];

    if (existingKey) {
      await this.storageService.deleteObject(existingKey);
    }

    const uploaded = await this.storageService.uploadObject({
      folder,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const settings = await this.storeSettingsRepository.update({
      [keyField]: uploaded.storageKey,
      [urlField]: this.storageService.getReadableUrl(uploaded.storageKey),
    });

    return this.mapStoreSettings(settings);
  }

  private async deleteAsset(field: 'logo' | 'favicon') {
    const existing = await this.storeSettingsRepository.getOrCreate();
    const keyField = field === 'logo' ? 'logoKey' : 'faviconKey';
    const urlField = field === 'logo' ? 'logoUrl' : 'faviconUrl';

    if (existing[keyField]) {
      await this.storageService.deleteObject(existing[keyField]!);
    }

    const settings = await this.storeSettingsRepository.update({
      [keyField]: null,
      [urlField]: null,
    });

    return this.mapStoreSettings(settings);
  }

  private mapStoreSettings(settings: {
    id: string;
    storeName: string;
    storeTagline: string | null;
    logoUrl: string | null;
    logoKey?: string | null;
    faviconUrl: string | null;
    faviconKey?: string | null;
    defaultLocale: string;
    timezone: string;
    defaultCurrencyCode: string;
    defaultTaxRateId: string | null;
    pricesIncludeTax: boolean;
    metaTitleDefault: string | null;
    metaDescriptionDefault: string | null;
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    guestCheckoutEnabled: boolean;
    minOrderAmount: { toString(): string } | null;
    orderNumberPrefix: string;
    defaultWarehouseId: string | null;
    lowStockGlobalThreshold: number | null;
    freeShippingMinAmount: { toString(): string } | null;
    handlingDaysMin: number | null;
    handlingDaysMax: number | null;
    warrantyPolicyUrl: string | null;
    returnsPolicyUrl: string | null;
    privacyPolicyUrl: string | null;
    termsUrl: string | null;
    complaintsBookUrl: string | null;
    serialNumberRequired: boolean;
    orderConfirmationEmailEnabled: boolean;
    mailFromName: string | null;
    createdAt: Date;
    updatedAt: Date;
    defaultTaxRate?: { name: string } | null;
    defaultWarehouse?: { name: string } | null;
  }): StoreSettingsRecord {
    return {
      id: settings.id,
      storeName: settings.storeName,
      storeTagline: settings.storeTagline,
      logoUrl: settings.logoKey
        ? this.storageService.getReadableUrl(settings.logoKey)
        : settings.logoUrl,
      logoKey: settings.logoKey ?? null,
      faviconUrl: settings.faviconKey
        ? this.storageService.getReadableUrl(settings.faviconKey)
        : settings.faviconUrl,
      faviconKey: settings.faviconKey ?? null,
      defaultLocale: settings.defaultLocale,
      timezone: settings.timezone,
      defaultCurrencyCode: settings.defaultCurrencyCode,
      defaultTaxRateId: settings.defaultTaxRateId,
      defaultTaxRateName: settings.defaultTaxRate?.name ?? null,
      pricesIncludeTax: settings.pricesIncludeTax,
      metaTitleDefault: settings.metaTitleDefault,
      metaDescriptionDefault: settings.metaDescriptionDefault,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      guestCheckoutEnabled: settings.guestCheckoutEnabled,
      minOrderAmount: this.decimalToString(settings.minOrderAmount),
      orderNumberPrefix: settings.orderNumberPrefix,
      defaultWarehouseId: settings.defaultWarehouseId,
      defaultWarehouseName: settings.defaultWarehouse?.name ?? null,
      lowStockGlobalThreshold: settings.lowStockGlobalThreshold,
      freeShippingMinAmount: this.decimalToString(settings.freeShippingMinAmount),
      handlingDaysMin: settings.handlingDaysMin,
      handlingDaysMax: settings.handlingDaysMax,
      warrantyPolicyUrl: settings.warrantyPolicyUrl,
      returnsPolicyUrl: settings.returnsPolicyUrl,
      privacyPolicyUrl: settings.privacyPolicyUrl,
      termsUrl: settings.termsUrl,
      complaintsBookUrl: settings.complaintsBookUrl,
      serialNumberRequired: settings.serialNumberRequired,
      orderConfirmationEmailEnabled: settings.orderConfirmationEmailEnabled,
      mailFromName: settings.mailFromName,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  private decimalToString(value: { toString(): string } | null | undefined) {
    return value != null ? value.toString() : null;
  }
}
