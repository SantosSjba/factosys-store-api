import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserStatus } from '../../../../generated/prisma/client';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+51988888888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: [
      UserStatus.PENDING_VERIFICATION,
      UserStatus.ACTIVE,
      UserStatus.SUSPENDED,
    ],
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'NuevaClave123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description:
      'Si es true, revoca la verificación del correo y deja la cuenta pendiente de verificación.',
  })
  @IsOptional()
  @IsBoolean()
  clearEmailVerification?: boolean;
}
