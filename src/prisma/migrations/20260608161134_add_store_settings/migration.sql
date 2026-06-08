-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT,
    "tradeName" TEXT,
    "taxId" TEXT,
    "taxRegime" TEXT,
    "fiscalAddress" TEXT,
    "district" TEXT,
    "province" TEXT,
    "department" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PE',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "logoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'Factosys Store',
    "storeTagline" TEXT,
    "logoUrl" TEXT,
    "logoKey" TEXT,
    "faviconUrl" TEXT,
    "faviconKey" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'es-PE',
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "defaultCurrencyCode" TEXT NOT NULL DEFAULT 'PEN',
    "defaultTaxRateId" TEXT,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "metaTitleDefault" TEXT,
    "metaDescriptionDefault" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "guestCheckoutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minOrderAmount" DECIMAL(12,2),
    "orderNumberPrefix" TEXT NOT NULL DEFAULT 'FS-',
    "defaultWarehouseId" TEXT,
    "lowStockGlobalThreshold" INTEGER,
    "freeShippingMinAmount" DECIMAL(12,2),
    "handlingDaysMin" INTEGER,
    "handlingDaysMax" INTEGER,
    "warrantyPolicyUrl" TEXT,
    "returnsPolicyUrl" TEXT,
    "privacyPolicyUrl" TEXT,
    "termsUrl" TEXT,
    "serialNumberRequired" BOOLEAN NOT NULL DEFAULT false,
    "orderConfirmationEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mailFromName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "rate" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesToShipping" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_isActive_sortOrder_idx" ON "Currency"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "TaxRate_isActive_sortOrder_idx" ON "TaxRate"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_defaultTaxRateId_fkey" FOREIGN KEY ("defaultTaxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_defaultWarehouseId_fkey" FOREIGN KEY ("defaultWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
