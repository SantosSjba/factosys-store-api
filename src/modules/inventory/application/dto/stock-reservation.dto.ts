import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockReservationStatus } from '../../../../generated/prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/dto/pagination-query.dto';

export class CreateStockReservationDto {
  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Referencia externa (ej. pedido, cotización)',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ListReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StockReservationStatus })
  @IsOptional()
  @IsEnum(StockReservationStatus)
  status?: StockReservationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;
}
