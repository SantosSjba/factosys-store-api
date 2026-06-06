import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RolesService } from '../../application/services/roles.service';

@ApiTags('Admin Permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
@UserTypes('STAFF')
export class AdminPermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({ summary: 'Catálogo de permisos del sistema' })
  listPermissions() {
    return this.rolesService.listPermissions();
  }
}
