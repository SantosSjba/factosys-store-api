import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  storeTagline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  defaultLocale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  defaultCurrencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  defaultTaxRateId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pricesIncludeTax?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitleDefault?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescriptionDefault?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  maintenanceMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  guestCheckoutEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  orderNumberPrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  defaultWarehouseId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockGlobalThreshold?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingMinAmount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatShippingFee?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  handlingDaysMin?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  handlingDaysMax?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warrantyPolicyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  returnsPolicyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  privacyPolicyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complaintsBookUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  serialNumberRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  orderConfirmationEmailEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Horas para cancelar pedidos GATEWAY sin pagar. 0 o null deshabilita la limpieza automática.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  abandonedGatewayOrderExpiryHours?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mailFromName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  pickupPointName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  pickupPointAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  pickupPointDistrict?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  pickupPointProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  pickupPointDepartment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pickupPointHours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  pickupPointPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paymentCashEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paymentBankTransferEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paymentYapeEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paymentPlinEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankTransferInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  yapeNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  plinNumber?: string;
}
