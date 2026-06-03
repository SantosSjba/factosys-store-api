import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token de verificación enviado al correo' })
  @IsString()
  token: string;
}
