import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { RolesService } from '../../application/services/roles.service';

@ApiTags('Admin Roles')
@ApiBearerAuth()
@Controller('admin/roles')
@UserTypes('STAFF')
export class AdminRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @ApiOperation({
    summary: 'Listar roles del panel para asignación de usuarios',
  })
  listRoles() {
    return this.rolesService.listStaffRoles();
  }
}
