import { ApiProperty } from '@nestjs/swagger';

export enum HealthStatus {
  OK = 'ok',
  DEGRADED = 'degraded',
  ERROR = 'error',
}

export enum TechnologyHealthStatus {
  UP = 'up',
  DOWN = 'down',
  CONFIGURED = 'configured',
}

export class ApiHealthDto {
  @ApiProperty({ example: 'up', enum: ['up'] })
  status: 'up';

  @ApiProperty({ example: 'FACTOSYS STORE API' })
  name: string;

  @ApiProperty({ example: '0.0.1' })
  version: string;

  @ApiProperty({ example: 'development' })
  environment: string;

  @ApiProperty({ example: 1234, description: 'Tiempo activo en segundos' })
  uptimeSeconds: number;
}

export class TechnologyHealthDto {
  @ApiProperty({ example: 'PostgreSQL' })
  name: string;

  @ApiProperty({ example: 'postgresql' })
  key: string;

  @ApiProperty({ enum: TechnologyHealthStatus, example: TechnologyHealthStatus.UP })
  status: TechnologyHealthStatus;

  @ApiProperty({ example: 18, required: false })
  responseTimeMs?: number;

  @ApiProperty({
    example: 'Conexión establecida correctamente',
    required: false,
  })
  message?: string;
}

export class HealthResponseDto {
  @ApiProperty({ enum: HealthStatus, example: HealthStatus.OK })
  status: HealthStatus;

  @ApiProperty({ type: ApiHealthDto })
  api: ApiHealthDto;

  @ApiProperty({ type: [TechnologyHealthDto] })
  technologies: TechnologyHealthDto[];

  @ApiProperty({ example: '2026-06-01T16:00:00.000Z' })
  timestamp: string;
}
