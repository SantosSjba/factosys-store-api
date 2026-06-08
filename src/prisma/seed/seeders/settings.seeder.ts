import { seedPrisma } from '../client';

export async function seedSettings(): Promise<string[]> {
  const company = await seedPrisma.companyProfile.upsert({
    where: { id: 'default' },
    update: {
      tradeName: 'Factosys Store',
      country: 'PE',
    },
    create: {
      id: 'default',
      legalName: 'Factosys Tecnología S.A.C.',
      tradeName: 'Factosys Store',
      taxId: '20123456789',
      taxRegime: 'Régimen general',
      country: 'PE',
      department: 'Lima',
      province: 'Lima',
      district: 'Miraflores',
      supportEmail: 'soporte@factosys.store',
    },
  });

  const currency = await seedPrisma.currency.upsert({
    where: { code: 'PEN' },
    update: {
      name: 'Sol peruano',
      symbol: 'S/',
      isDefault: true,
      isActive: true,
    },
    create: {
      code: 'PEN',
      name: 'Sol peruano',
      symbol: 'S/',
      exchangeRate: 1,
      decimalPlaces: 2,
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
  });

  const usd = await seedPrisma.currency.upsert({
    where: { code: 'USD' },
    update: {
      name: 'Dólar estadounidense',
      symbol: '$',
      exchangeRate: 3.75,
      isActive: true,
    },
    create: {
      code: 'USD',
      name: 'Dólar estadounidense',
      symbol: '$',
      exchangeRate: 3.75,
      decimalPlaces: 2,
      isDefault: false,
      isActive: true,
      sortOrder: 1,
    },
  });

  const igv = await seedPrisma.taxRate.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {
      name: 'IGV',
      rate: 18,
      isDefault: true,
      isActive: true,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'IGV',
      code: '1000',
      rate: 18,
      isDefault: true,
      isActive: true,
      appliesToShipping: true,
      sortOrder: 0,
    },
  });

  const warehouse = await seedPrisma.warehouse.findFirst({
    where: { isDefault: true },
  });

  const store = await seedPrisma.storeSettings.upsert({
    where: { id: 'default' },
    update: {
      storeName: 'Factosys Store',
      defaultCurrencyCode: currency.code,
      defaultTaxRateId: igv.id,
      defaultWarehouseId: warehouse?.id ?? null,
    },
    create: {
      id: 'default',
      storeName: 'Factosys Store',
      storeTagline: 'Tecnología y componentes para tu negocio',
      defaultCurrencyCode: currency.code,
      defaultTaxRateId: igv.id,
      defaultWarehouseId: warehouse?.id ?? null,
      orderNumberPrefix: 'FS-',
      guestCheckoutEnabled: true,
      orderConfirmationEmailEnabled: true,
      handlingDaysMin: 1,
      handlingDaysMax: 3,
    },
  });

  return [
    `Empresa: ${company.tradeName ?? company.legalName}`,
    `Monedas: ${currency.code}, ${usd.code}`,
    `Impuesto: ${igv.name} ${igv.rate}%`,
    `Tienda: ${store.storeName}`,
  ];
}
