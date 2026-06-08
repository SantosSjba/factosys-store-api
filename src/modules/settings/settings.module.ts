import { Module } from '@nestjs/common';
import { CompanyService } from './application/services/company.service';
import { CurrenciesService } from './application/services/currencies.service';
import { StoreSettingsService } from './application/services/store-settings.service';
import { TaxesService } from './application/services/taxes.service';
import { PrismaCompanyRepository } from './infrastructure/repositories/prisma-company.repository';
import { PrismaCurrencyRepository } from './infrastructure/repositories/prisma-currency.repository';
import { PrismaStoreSettingsRepository } from './infrastructure/repositories/prisma-store-settings.repository';
import { PrismaTaxRepository } from './infrastructure/repositories/prisma-tax.repository';
import { AdminCompanyController } from './presentation/controllers/admin-company.controller';
import { AdminCurrenciesController } from './presentation/controllers/admin-currencies.controller';
import { AdminStoreSettingsController } from './presentation/controllers/admin-store-settings.controller';
import { AdminTaxesController } from './presentation/controllers/admin-taxes.controller';
import { StoreSettingsController } from './presentation/controllers/store-settings.controller';

@Module({
  controllers: [
    AdminCompanyController,
    AdminStoreSettingsController,
    AdminCurrenciesController,
    AdminTaxesController,
    StoreSettingsController,
  ],
  providers: [
    PrismaCompanyRepository,
    PrismaStoreSettingsRepository,
    PrismaCurrencyRepository,
    PrismaTaxRepository,
    CompanyService,
    StoreSettingsService,
    CurrenciesService,
    TaxesService,
  ],
  exports: [CompanyService, StoreSettingsService, CurrenciesService, TaxesService],
})
export class SettingsModule {}
