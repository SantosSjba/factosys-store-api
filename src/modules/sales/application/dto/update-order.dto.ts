import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OrderPaymentStatus,
  OrderStatus,
} from '../../../../generated/prisma/client';

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateOrderPaymentDto {
  @ApiProperty({ enum: OrderPaymentStatus })
  @IsEnum(OrderPaymentStatus)
  paymentStatus!: OrderPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RefundOrderDto {
  @ApiProperty({ enum: RefundType })
  @IsEnum(RefundType)
  type!: RefundType;

  @ApiPropertyOptional({
    description: 'Monto reembolsado (obligatorio si type=partial)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    description:
      'Devolver stock al almacén (por defecto true en reembolso total)',
  })
  @IsOptional()
  @IsBoolean()
  restockItems?: boolean;
}
