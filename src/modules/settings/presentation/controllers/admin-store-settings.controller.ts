import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { UpdateStoreSettingsDto } from '../../application/dto/store-settings.dto';
import { StoreSettingsService } from '../../application/services/store-settings.service';

const imageUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('Admin Settings')
@ApiBearerAuth()
@Controller('admin/settings/store')
@UserTypes('STAFF')
export class AdminStoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Obtener configuración de la tienda' })
  getStoreSettings() {
    return this.storeSettingsService.getStoreSettings();
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Actualizar configuración de la tienda' })
  updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
    return this.storeSettingsService.updateStoreSettings(dto);
  }

  @Post('logo')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir logo de la tienda' })
  uploadLogo(@UploadedFile() file: UploadedImageFile) {
    return this.storeSettingsService.uploadLogo(file);
  }

  @Delete('logo')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Eliminar logo de la tienda' })
  removeLogo() {
    return this.storeSettingsService.deleteLogo();
  }

  @Post('favicon')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir favicon de la tienda' })
  uploadFavicon(@UploadedFile() file: UploadedImageFile) {
    return this.storeSettingsService.uploadFavicon(file);
  }

  @Delete('favicon')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Eliminar favicon de la tienda' })
  removeFavicon() {
    return this.storeSettingsService.deleteFavicon();
  }
}
