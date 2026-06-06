import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Kingston' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'kingston' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://www.kingston.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
