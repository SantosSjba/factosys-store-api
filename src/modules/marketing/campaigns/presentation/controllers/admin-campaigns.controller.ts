import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../../shared/constants/permissions.constants';
import { PaginationQueryDto } from '../../../../../shared/dto/pagination-query.dto';
import { CreateCampaignDto } from '../../application/dto/create-campaign.dto';
import { UpdateCampaignDto } from '../../application/dto/update-campaign.dto';
import { CampaignsService } from '../../application/services/campaigns.service';

@ApiTags('Admin Campaigns')
@ApiBearerAuth()
@Controller('admin/campaigns')
@UserTypes('STAFF')
export class AdminCampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MARKETING_READ)
  @ApiOperation({ summary: 'Listar campañas' })
  list(@Query() query: PaginationQueryDto) {
    return this.campaignsService.listCampaigns(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MARKETING_WRITE)
  @ApiOperation({ summary: 'Crear campaña' })
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.MARKETING_READ)
  @ApiOperation({ summary: 'Detalle de campaña' })
  getOne(@Param('id') id: string) {
    return this.campaignsService.getCampaign(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MARKETING_WRITE)
  @ApiOperation({ summary: 'Actualizar campaña' })
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.updateCampaign(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.MARKETING_WRITE)
  @ApiOperation({ summary: 'Eliminar campaña' })
  remove(@Param('id') id: string) {
    return this.campaignsService.deleteCampaign(id);
  }
}
