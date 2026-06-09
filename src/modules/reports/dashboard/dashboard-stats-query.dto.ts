import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class DashboardStatsQueryDto {
  @ApiPropertyOptional({ description: 'Inicio del rango (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fin del rango (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
