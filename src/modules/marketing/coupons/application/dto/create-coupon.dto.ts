import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponType } from '../../../../../generated/prisma/client';

export class CreateCouponDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  code!: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type!: CouponType;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  value!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
