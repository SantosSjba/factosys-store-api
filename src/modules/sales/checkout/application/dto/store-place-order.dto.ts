import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  OrderDeliveryMethod,
  OrderPaymentMethod,
} from '../../../../../generated/prisma/client';
import { StoreCheckoutQuoteDto } from './store-checkout-quote.dto';

export class StoreCheckoutShippingAddressDto {
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
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ description: 'Calle, número y urbanización' })
  @IsString()
  @MaxLength(300)
  addressLine1!: string;

  @ApiPropertyOptional({ description: 'Referencia o interior' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine2?: string;

  @ApiProperty({ description: 'Distrito' })
  @IsString()
  @MaxLength(120)
  district!: string;

  @ApiProperty({ description: 'Provincia' })
  @IsString()
  @MaxLength(120)
  province!: string;

  @ApiProperty({ description: 'Departamento' })
  @IsString()
  @MaxLength(120)
  department!: string;

  @ApiPropertyOptional({ default: 'PE' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

export class StorePlaceOrderDto extends StoreCheckoutQuoteDto {
  @ApiProperty({ enum: OrderPaymentMethod })
  @IsEnum(OrderPaymentMethod)
  paymentMethod!: OrderPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNotes?: string;

  @ApiPropertyOptional({ type: StoreCheckoutShippingAddressDto })
  @ValidateIf(
    (dto: StorePlaceOrderDto) =>
      dto.deliveryMethod === OrderDeliveryMethod.SHIPPING,
  )
  @ValidateNested()
  @Type(() => StoreCheckoutShippingAddressDto)
  shippingAddress?: StoreCheckoutShippingAddressDto;
}
