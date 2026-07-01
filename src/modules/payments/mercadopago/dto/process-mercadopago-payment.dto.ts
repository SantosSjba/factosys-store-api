import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class MercadoPagoPayerIdentificationDto {
  @ApiPropertyOptional({ example: 'DNI' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  number?: string;
}

export class ProcessMercadoPagoPaymentDto {
  @ApiProperty({ enum: ['card', 'yape'], description: 'Canal Checkout API Orders' })
  @IsIn(['card', 'yape'])
  paymentChannel!: 'card' | 'yape';

  @ApiProperty({
    description: 'Token generado por MercadoPago.js (Checkout API)',
  })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ example: 'visa' })
  @IsString()
  @MinLength(1)
  paymentMethodId!: string;

  @ApiPropertyOptional({
    example: 'credit_card',
    description: 'Tipo reportado por el formulario de tarjeta (Checkout API)',
  })
  @IsOptional()
  @IsIn(['credit_card', 'debit_card', 'prepaid_card'])
  paymentMethodType?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  installments?: number;

  @ApiProperty()
  @IsEmail()
  payerEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MercadoPagoPayerIdentificationDto)
  payerIdentification?: MercadoPagoPayerIdentificationDto;

  @ApiPropertyOptional({
    description: 'Clave única por intento de pago (X-Idempotency-Key en Mercado Pago)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  idempotencyKey?: string;
}
