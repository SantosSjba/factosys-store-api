import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderDeliveryMethod } from '../../../../../generated/prisma/client';

export class StoreCheckoutQuoteDto {
  @ApiProperty({ enum: OrderDeliveryMethod })
  @IsEnum(OrderDeliveryMethod)
  deliveryMethod!: OrderDeliveryMethod;

  @ApiPropertyOptional({ description: 'Departamento (Perú)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @ApiPropertyOptional({ description: 'Provincia (Perú)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}
