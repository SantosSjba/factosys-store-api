import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserStatus } from '../../../../generated/prisma/client';
import { RoleSlug } from '../../../../shared/constants/roles.constants';

export class UpdateStaffUserDto {
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

  @ApiPropertyOptional({ enum: [UserStatus.ACTIVE, UserStatus.SUSPENDED] })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'NuevaClave123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: ['manager', 'support'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleSlugs?: RoleSlug[];
}
