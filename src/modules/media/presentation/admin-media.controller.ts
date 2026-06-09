import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import type { AuthenticatedUser } from '../../../shared/interfaces/jwt-payload.interface';
import type { UploadedImageFile } from '../../../shared/types/uploaded-file.type';
import { MediaService } from '../application/media.service';
import { ListMediaQueryDto } from '../application/list-media-query.dto';

const uploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

@ApiTags('Admin Media')
@ApiBearerAuth()
@Controller('admin/media')
@UserTypes('STAFF')
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MEDIA_READ)
  @ApiOperation({ summary: 'Listar biblioteca de medios' })
  list(@Query() query: ListMediaQueryDto) {
    return this.mediaService.list(query);
  }

  @Post('upload')
  @RequirePermissions(PERMISSIONS.MEDIA_WRITE)
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir archivo a biblioteca' })
  upload(
    @UploadedFile() file: UploadedImageFile,
    @Query('folder') folder: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.upload(file, user.id, folder);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.MEDIA_WRITE)
  @ApiOperation({ summary: 'Eliminar archivo de biblioteca' })
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
