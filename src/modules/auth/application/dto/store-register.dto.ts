import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class StoreRegisterDto {
  @ApiProperty({ example: 'cliente@ejemplo.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;

  @ApiProperty({ example: 'Cliente123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+51999999999' })
  @IsOptional()
  @IsString()
  phone?: string;
}
