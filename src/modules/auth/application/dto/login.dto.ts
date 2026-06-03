import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@factosys.store' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;
}
