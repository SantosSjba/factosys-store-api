import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  OrderAddressType,
  OrderDeliveryMethod,
  OrderPaymentStatus,
  OrderSource,
} from '../../../../generated/prisma/client';

export class CreateOrderItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderAddressDto {
  @ApiProperty({ enum: OrderAddressType })
  @IsEnum(OrderAddressType)
  type!: OrderAddressType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  addressLine1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guestFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guestLastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  guestPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ type: [CreateOrderAddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderAddressDto)
  addresses?: CreateOrderAddressDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  @ApiPropertyOptional({ enum: OrderPaymentStatus })
  @IsOptional()
  @IsEnum(OrderPaymentStatus)
  paymentStatus?: OrderPaymentStatus;

  @ApiPropertyOptional({ enum: OrderSource })
  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @ApiPropertyOptional({ enum: OrderDeliveryMethod })
  @IsOptional()
  @IsEnum(OrderDeliveryMethod)
  deliveryMethod?: OrderDeliveryMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Código de cupón (reemplaza discountAmount manual)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}
