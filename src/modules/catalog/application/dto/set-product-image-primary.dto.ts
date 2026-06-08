import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SetProductImagePrimaryDto {
  @ApiPropertyOptional({
    description: 'true para marcar como principal, false para quitar la marca',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
