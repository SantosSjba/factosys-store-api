import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleSlug } from '../../../../shared/constants/roles.constants';

export class CreateStaffUserDto {
  @ApiProperty({ example: 'gestor@factosys.store' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Gestor123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'María' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'López' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+51988888888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: ['manager'],
    description: 'Slugs de roles STAFF (admin, manager, support, warehouse)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleSlugs: RoleSlug[];
}
