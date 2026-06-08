export type CompanyProfileRecord = {
  id: string;
  legalName: string | null;
  tradeName: string | null;
  taxId: string | null;
  taxRegime: string | null;
  fiscalAddress: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  country: string;
  supportEmail: string | null;
  supportPhone: string | null;
  whatsapp: string | null;
  website: string | null;
  logoUrl: string | null;
  logoKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoreSettingsRecord = {
  id: string;
  storeName: string;
  storeTagline: string | null;
  logoUrl: string | null;
  logoKey: string | null;
  faviconUrl: string | null;
  faviconKey: string | null;
  defaultLocale: string;
  timezone: string;
  defaultCurrencyCode: string;
  defaultTaxRateId: string | null;
  defaultTaxRateName: string | null;
  pricesIncludeTax: boolean;
  metaTitleDefault: string | null;
  metaDescriptionDefault: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  guestCheckoutEnabled: boolean;
  minOrderAmount: string | null;
  orderNumberPrefix: string;
  defaultWarehouseId: string | null;
  defaultWarehouseName: string | null;
  lowStockGlobalThreshold: number | null;
  freeShippingMinAmount: string | null;
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
};

export type CurrencyRecord = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: string;
  decimalPlaces: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TaxRateRecord = {
  id: string;
  name: string;
  code: string | null;
  rate: string;
  isDefault: boolean;
  isActive: boolean;
  appliesToShipping: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicStoreSettingsRecord = {
  storeName: string;
  storeTagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  defaultLocale: string;
  timezone: string;
  currency: {
    code: string;
    symbol: string;
    decimalPlaces: number;
  };
  tax: {
    name: string;
    rate: string;
    pricesIncludeTax: boolean;
  } | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  guestCheckoutEnabled: boolean;
  minOrderAmount: string | null;
  freeShippingMinAmount: string | null;
  handlingDaysMin: number | null;
  handlingDaysMax: number | null;
  warrantyPolicyUrl: string | null;
  returnsPolicyUrl: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  complaintsBookUrl: string | null;
  company: {
    tradeName: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    whatsapp: string | null;
    website: string | null;
  };
};
