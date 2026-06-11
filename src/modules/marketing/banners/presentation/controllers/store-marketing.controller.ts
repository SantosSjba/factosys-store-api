import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BannerPlacement } from '../../../../../generated/prisma/client';
import { Public } from '../../../../../shared/decorators/public.decorator';
import { ListPublicBannersQueryDto } from '../../application/dto/list-public-banners-query.dto';
import { BannersService } from '../../application/services/banners.service';

@ApiTags('Store Marketing')
@Controller('store/marketing')
export class StoreMarketingController {
  constructor(private readonly bannersService: BannersService) {}

  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'Banners activos para la vitrina pública' })
  listBanners(@Query() query: ListPublicBannersQueryDto) {
    return this.bannersService.listPublicBanners(
      query.placement ?? BannerPlacement.HOME_HERO,
    );
  }
}
