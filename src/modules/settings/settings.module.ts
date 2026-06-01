import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { TaxesModule } from './taxes/taxes.module';

@Module({
  imports: [CurrenciesModule, TaxesModule, CompaniesModule],
})
export class SettingsModule {}
