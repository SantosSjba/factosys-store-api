import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PermissionSlug } from '../../../../shared/constants/permissions.constants';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener minúsculas, números y guiones.',
  })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  permissionSlugs!: PermissionSlug[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}
