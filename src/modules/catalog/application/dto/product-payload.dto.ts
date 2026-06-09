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
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ProductStatus,
  ProductType,
} from '../../../../generated/prisma/client';

export class AttributeValueDto {
  @ApiProperty()
  @IsUUID()
  attributeId!: string;

  @ApiProperty({ example: '16' })
  @IsString()
  value!: string;
}

export class CreateProductVariantDto {
  @ApiPropertyOptional({
    description: 'ID de variante existente (solo en actualización)',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'LAPTOP-I7-16-512' })
  @IsString()
  sku!: string;

  @ApiPropertyOptional({ example: '16GB RAM / 512GB SSD' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 3499.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 3999.99 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 2.1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [AttributeValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  attributeValues?: AttributeValueDto[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop Pro 15"' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'laptop-pro-15' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiProperty()
  @IsUUID()
  primaryCategoryId!: string;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.SIMPLE })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [AttributeValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  attributeValues?: AttributeValueDto[];

  @ApiProperty({ type: [CreateProductVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants!: CreateProductVariantDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  primaryCategoryId?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [AttributeValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  attributeValues?: AttributeValueDto[];

  @ApiPropertyOptional({ type: [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
