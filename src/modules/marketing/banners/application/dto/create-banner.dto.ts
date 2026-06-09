import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { BannerPlacement } from '../../../../../generated/prisma/client';

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @ApiPropertyOptional({ enum: BannerPlacement })
  @IsOptional()
  @IsEnum(BannerPlacement)
  placement?: BannerPlacement;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

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
