import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Public } from '../../shared/decorators/public.decorator';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthResponseDto, HealthStatus } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Estado de salud de la API',
    description:
      'Verifica el estado general de la API y el estado de las tecnologías activas (PostgreSQL, Redis, Elasticsearch, etc.).',
  })
  @ApiOkResponse({
    description:
      'API operativa (puede estar degradada si algún servicio falla)',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'API con servicios críticos no disponibles',
    type: HealthResponseDto,
  })
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponseDto> {
    const health = await this.healthService.getHealthStatus();

    if (health.status === HealthStatus.ERROR) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}
