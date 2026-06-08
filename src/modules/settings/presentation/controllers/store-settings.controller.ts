import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared/decorators/public.decorator';
import { StoreSettingsService } from '../../application/services/store-settings.service';

@ApiTags('Store Settings')
@Controller('store/settings')
export class StoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Configuración pública de la tienda' })
  getPublicSettings() {
    return this.storeSettingsService.getPublicSettings();
  }
}
