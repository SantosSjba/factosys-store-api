import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  AttributeDataType,
  AttributeScope,
} from '../../../../generated/prisma/client';

export class CreateAttributeDto {
  @ApiProperty({ example: 'Memoria RAM' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'memoria-ram' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: AttributeDataType,
    default: AttributeDataType.TEXT,
  })
  @IsOptional()
  @IsEnum(AttributeDataType)
  dataType?: AttributeDataType;

  @ApiPropertyOptional({ example: 'GB' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    enum: AttributeScope,
    default: AttributeScope.PRODUCT,
  })
  @IsOptional()
  @IsEnum(AttributeScope)
  scope?: AttributeScope;

  @ApiPropertyOptional({ type: [String], example: ['8', '16', '32'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
