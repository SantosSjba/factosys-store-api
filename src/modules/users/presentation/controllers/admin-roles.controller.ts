import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../../shared/decorators/permissions.decorator';
import { UserTypes } from '../../../../shared/decorators/user-types.decorator';
import { PERMISSIONS } from '../../../../shared/constants/permissions.constants';
import { UpdateRolePermissionsDto } from '../../application/dto/update-role-permissions.dto';
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

  @Patch(':slug/permissions')
  @RequirePermissions(PERMISSIONS.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Actualizar permisos de un rol staff' })
  updateRolePermissions(
    @Param('slug') slug: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(slug, dto);
  }
}
