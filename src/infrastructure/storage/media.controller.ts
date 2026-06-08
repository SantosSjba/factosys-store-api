import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../shared/decorators/public.decorator';
import { StorageService } from './storage.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Get('*path')
  @ApiOperation({
    summary: 'Servir archivo desde MinIO/S3',
    description:
      'Proxy de lectura para objetos privados. Usado por URLs /api/media/{storageKey}.',
  })
  async serveObject(
    @Param('path') path: string | string[],
    @Res() response: Response,
  ): Promise<void> {
    const storageKey = Array.isArray(path) ? path.join('/') : path;

    if (!storageKey?.trim()) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Archivo no encontrado.',
      });
    }

    await this.storageService.streamObject(storageKey, response);
  }
}
