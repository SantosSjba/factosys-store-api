import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  @ApiProperty({
    example: true,
    description: 'Aceptación obligatoria de términos y condiciones',
  })
  @IsBoolean({ message: 'Debes aceptar los términos y condiciones.' })
  @Equals(true, { message: 'Debes aceptar los términos y condiciones.' })
  acceptTerms: boolean;
}
