import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '../../../../generated/prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @ApiProperty({
    description:
      'Cantidad positiva para entradas/salidas/transferencias. Ajuste puede ser negativo.',
    example: 10,
  })
  @IsInt()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Requerido para transferencias' })
  @ValidateIf(
    (dto: CreateStockMovementDto) => dto.type === StockMovementType.TRANSFER,
  )
  @IsUUID()
  targetWarehouseId?: string;
}

export class UpdateStockThresholdDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  lowStockThreshold!: number;
}
