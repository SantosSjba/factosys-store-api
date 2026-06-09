import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../../shared/constants/permissions.constants';
import { PaginationQueryDto } from '../../../../../shared/dto/pagination-query.dto';
import type { UploadedImageFile } from '../../../../../shared/types/uploaded-file.type';
import { CreateBannerDto } from '../../application/dto/create-banner.dto';
import { UpdateBannerDto } from '../../application/dto/update-banner.dto';
import { BannersService } from '../../application/services/banners.service';

const imageUploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('Admin Banners')
@ApiBearerAuth()
@Controller('admin/banners')
@UserTypes('STAFF')
export class AdminBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MARKETING_READ)
  @ApiOperation({ summary: 'Listar banners' })
  list(@Query() query: PaginationQueryDto) {
    return this.bannersService.listBanners(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MARKETING_WRITE)
  @ApiOperation({ summary: 'Crear banner' })
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.createBanner(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.MARKETING_READ)
  @ApiOperation({ summary: 'Detalle de banner' })
  getOne(@Param('id') id: string) {
    return this.bannersService.getBanner(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MARKETING_WRITE)
  @ApiOperation({ summary: 'Actualizar banner' })
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.updateBanner(id, dto);
  }

  @Post(':id/image')
  @RequirePermissions(PERMISSIONS.MARKETING_WRITE)
  @UseInterceptors(imageUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir imagen de banner' })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.bannersService.uploadBannerImage(id, file);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.MARKETING_WRITE)
  @ApiOperation({ summary: 'Eliminar banner' })
  remove(@Param('id') id: string) {
    return this.bannersService.deleteBanner(id);
  }
}
