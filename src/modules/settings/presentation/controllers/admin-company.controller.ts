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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { UploadedImageFile } from '../../../../shared/types/uploaded-file.type';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { UpdateCompanyProfileDto } from '../../application/dto/company.dto';
import { CompanyService } from '../../application/services/company.service';

const logoUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('Admin Settings')
@ApiBearerAuth()
@Controller('admin/settings/company')
@UserTypes('STAFF')
export class AdminCompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Obtener perfil de empresa' })
  getCompany() {
    return this.companyService.getCompany();
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Actualizar perfil de empresa' })
  updateCompany(@Body() dto: UpdateCompanyProfileDto) {
    return this.companyService.updateCompany(dto);
  }

  @Post('logo')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @UseInterceptors(logoUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir logo de empresa' })
  uploadLogo(@UploadedFile() file: UploadedImageFile) {
    return this.companyService.uploadLogo(file);
  }

  @Delete('logo')
  @RequirePermissions(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Eliminar logo de empresa' })
  removeLogo() {
    return this.companyService.deleteLogo();
  }
}
