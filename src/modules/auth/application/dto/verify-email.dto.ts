import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiPropertyOptional({ description: 'Token legado de verificación (enlace antiguo)' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: 'cliente@ejemplo.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '482913', description: 'Código de 6 dígitos enviado al correo' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos.' })
  code?: string;
}
