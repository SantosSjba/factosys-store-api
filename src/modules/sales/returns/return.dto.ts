import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ReturnRequestReason,
  ReturnRequestStatus,
} from '../../../generated/prisma/client';

export class ReturnRequestItemDto {
  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateReturnRequestDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: ReturnRequestReason })
  @IsEnum(ReturnRequestReason)
  reason!: ReturnRequestReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reasonNote?: string;

  @ApiProperty({ type: [ReturnRequestItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnRequestItemDto)
  items!: ReturnRequestItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  restockItems?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNotes?: string;
}

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnRequestStatus })
  @IsEnum(ReturnRequestStatus)
  status!: ReturnRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  refundAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNotes?: string;
}
